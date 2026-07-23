import { forwardRef, type ComponentType } from "react"
import * as React from "react"
import { RenderTarget } from "framer"

type CartLine = {
    sku: string
    productId: string
    productCode: string
    title: string
    colorName: string
    size: string
    quantity: number
    price: number
    image?: {
        src?: string
        srcSet?: string
        alt?: string
    }
}

const STORAGE_KEY = "stride-pulse-cart"
const CART_SYNC_EVENT = "stride-pulse-cart-sync"
const CART_OPEN_EVENT = "stride-cart-open"
const CART_CLOSE_EVENT = "stride-cart-close"

function isFramerCanvas() {
    return RenderTarget.current() === RenderTarget.canvas
}

function readCart(): CartLine[] {
    if (typeof window === "undefined") return []
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed
            .map((item) => ({
                sku: String(item?.sku ?? ""),
                productId: String(item?.productId ?? ""),
                productCode: String(item?.productCode ?? ""),
                title: String(item?.title ?? "Untitled Product"),
                colorName: String(item?.colorName ?? ""),
                size: String(item?.size ?? ""),
                quantity: Math.max(1, Number(item?.quantity ?? 1)),
                price: Number(item?.price ?? 0),
                image: item?.image
                    ? {
                          src: item.image.src
                              ? String(item.image.src)
                              : undefined,
                          srcSet: item.image.srcSet
                              ? String(item.image.srcSet)
                              : undefined,
                          alt: item.image.alt
                              ? String(item.image.alt)
                              : undefined,
                      }
                    : undefined,
            }))
            .filter((line) => line.sku)
    } catch (_error) {
        return []
    }
}

function writeCart(nextCart: CartLine[]) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCart))
    window.dispatchEvent(
        new CustomEvent(CART_SYNC_EVENT, {
            detail: { storageKey: STORAGE_KEY },
        })
    )
}

function useCart() {
    const [cart, setCart] = React.useState<CartLine[]>([])

    const refresh = React.useCallback(() => {
        React.startTransition(() => setCart(readCart()))
    }, [])

    React.useEffect(() => {
        refresh()
    }, [refresh])

    React.useEffect(() => {
        if (typeof window === "undefined") return
        const onSync = () => refresh()
        window.addEventListener(CART_SYNC_EVENT, onSync)
        window.addEventListener("storage", onSync)
        return () => {
            window.removeEventListener(CART_SYNC_EVENT, onSync)
            window.removeEventListener("storage", onSync)
        }
    }, [refresh])

    return { cart, refresh }
}

function toUSD(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value)
}

function callInteractionHandler(handler: unknown, event: any) {
    if (typeof handler === "function") handler(event)
}

function getActionLabel(action: "increase" | "decrease" | "remove", line: CartLine | null) {
    const title = line?.title || "item"
    if (action === "increase") return `Increase quantity for ${title}`
    if (action === "decrease") return `Decrease quantity for ${title}`
    return `Remove ${title} from cart`
}

function activateOnKeyboard(
    handler: (event: React.KeyboardEvent) => void
): React.KeyboardEventHandler {
    return (event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        handler(event)
    }
}

function setForwardedRef(ref: unknown, value: HTMLElement | null) {
    if (typeof ref === "function") {
        ref(value)
    } else if (ref && typeof ref === "object" && "current" in ref) {
        ;(ref as React.MutableRefObject<HTMLElement | null>).current = value
    }
}

function getFocusableElements(container: HTMLElement) {
    return Array.from(
        container.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
    ).filter(
        (element) =>
            !element.hasAttribute("disabled") &&
            element.getAttribute("aria-hidden") !== "true" &&
            element.offsetParent !== null
    )
}

function findByColor(cart: CartLine[], colorKeyword: string) {
    return (
        cart.find((line) =>
            String(line.colorName || "")
                .toLowerCase()
                .includes(colorKeyword.toLowerCase())
        ) ?? null
    )
}

function withRowVisibility(
    Component: ComponentType,
    keyword: string
): ComponentType {
    return forwardRef((props: any, ref) => {
        const { cart } = useCart()
        const line = findByColor(cart, keyword)
        const showRow = line || isFramerCanvas()
        return (
            <Component
                ref={ref}
                {...props}
                style={{
                    ...props.style,
                    display: showRow
                        ? (props.style?.display ?? "flex")
                        : "none",
                }}
            />
        )
    })
}

function withRowText(
    Component: ComponentType,
    keyword: string,
    getText: (line: CartLine | null) => string
): ComponentType {
    return forwardRef((props: any, ref) => {
        const { cart } = useCart()
        const line = findByColor(cart, keyword)
        return (
            <Component ref={ref} {...props}>
                {getText(line)}
            </Component>
        )
    })
}

function withRowImage(
    Component: ComponentType,
    keyword: string
): ComponentType {
    return forwardRef((props: any, ref) => {
        const { cart } = useCart()
        const line = findByColor(cart, keyword)
        const imageUrl = line?.image?.src ?? ""
        return (
            <Component
                ref={ref}
                {...props}
                style={{
                    ...props.style,
                    backgroundImage: imageUrl
                        ? `url("${imageUrl}")`
                        : props.style?.backgroundImage,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            />
        )
    })
}

function withRowAction(
    Component: ComponentType,
    keyword: string,
    action: "increase" | "decrease" | "remove"
): ComponentType {
    return forwardRef((props: any, ref) => {
        const { cart } = useCart()
        const line = findByColor(cart, keyword)
        const onTap = React.useCallback(
            (event: any) => {
                if (props.onTap) props.onTap(event)
                if (!line) return

                let next = cart
                if (action === "increase") {
                    next = cart.map((item) =>
                        item.sku === line.sku
                            ? {
                                  ...item,
                                  quantity: Math.max(1, item.quantity + 1),
                              }
                            : item
                    )
                } else if (action === "decrease") {
                    next = cart.map((item) =>
                        item.sku === line.sku
                            ? {
                                  ...item,
                                  quantity: Math.max(1, item.quantity - 1),
                              }
                            : item
                    )
                } else {
                    next = cart.filter((item) => item.sku !== line.sku)
                }
                writeCart(next)
            },
            [props, line, cart, action]
        )

        return (
            <Component
                ref={ref}
                {...props}
                onTap={onTap}
                role={props.role ?? "button"}
                tabIndex={props.tabIndex ?? 0}
                aria-label={props["aria-label"] ?? getActionLabel(action, line)}
                aria-disabled={!line}
                onKeyDown={activateOnKeyboard(onTap)}
                style={{
                    ...props.style,
                    cursor: props.style?.cursor ?? "pointer",
                    pointerEvents: props.style?.pointerEvents ?? "auto",
                }}
            />
        )
    })
}

export function withCanvasCartDrawer(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const isCanvas = isFramerCanvas()
        const [isOpen, setIsOpen] = React.useState(false)
        const drawerRef = React.useRef<HTMLElement | null>(null)
        const previousFocusRef = React.useRef<HTMLElement | null>(null)

        const assignDrawerRef = React.useCallback(
            (node: HTMLElement | null) => {
                drawerRef.current = node
                setForwardedRef(ref, node)
            },
            [ref]
        )

        React.useEffect(() => {
            if (typeof window === "undefined") return
            const open = () => {
                if (typeof document !== "undefined") {
                    previousFocusRef.current =
                        document.activeElement instanceof HTMLElement
                            ? document.activeElement
                            : null
                }
                React.startTransition(() => setIsOpen(true))
            }
            const close = () => React.startTransition(() => setIsOpen(false))
            window.addEventListener(CART_OPEN_EVENT, open)
            window.addEventListener(CART_CLOSE_EVENT, close)
            return () => {
                window.removeEventListener(CART_OPEN_EVENT, open)
                window.removeEventListener(CART_CLOSE_EVENT, close)
            }
        }, [])

        React.useEffect(() => {
            if (isCanvas || typeof document === "undefined") return

            document.body.style.overflow = isOpen ? "hidden" : ""

            return () => {
                document.body.style.overflow = ""
            }
        }, [isOpen, isCanvas])

        React.useEffect(() => {
            if (isCanvas || typeof window === "undefined") return

            if (!isOpen) {
                const previousFocus = previousFocusRef.current
                window.setTimeout(() => {
                    if (previousFocus && document.contains(previousFocus)) {
                        previousFocus.focus({ preventScroll: true })
                    }
                }, 0)
                return
            }

            const drawer = drawerRef.current
            window.setTimeout(() => {
                const focusable = drawer ? getFocusableElements(drawer) : []
                ;(focusable[0] ?? drawer)?.focus({ preventScroll: true })
            }, 0)

            const onKeyDown = (event: KeyboardEvent) => {
                if (event.key === "Escape") {
                    event.preventDefault()
                    window.dispatchEvent(new CustomEvent(CART_CLOSE_EVENT))
                    return
                }

                if (event.key !== "Tab" || !drawer) return
                const focusable = getFocusableElements(drawer)
                if (focusable.length === 0) {
                    event.preventDefault()
                    drawer.focus({ preventScroll: true })
                    return
                }

                const first = focusable[0]
                const last = focusable[focusable.length - 1]
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault()
                    last.focus({ preventScroll: true })
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault()
                    first.focus({ preventScroll: true })
                }
            }

            window.addEventListener("keydown", onKeyDown)
            return () => window.removeEventListener("keydown", onKeyDown)
        }, [isOpen, isCanvas])

        const drawerStyle = isCanvas
            ? {
                  ...props.style,
                  position: props.style?.position ?? "relative",
                  transform: "none",
                  transition: "none",
                  pointerEvents: "auto",
                  overflow: props.style?.overflow ?? "hidden",
              }
            : !isOpen
              ? {
                    ...props.style,
                    display: "block",
                    position: "fixed",
                    top: 0,
                    right: 0,
                    height: "100dvh",
                    width: "40vw",
                    maxWidth: "60vw",
                    minWidth: 320,
                    zIndex: 9999,
                    transform: "translateX(calc(100% + 24px))",
                    transition:
                        "transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)",
                    visibility: "visible",
                    opacity: props.style?.opacity ?? 1,
                    pointerEvents: "none",
                    overflow: "hidden",
                }
              : {
                    ...props.style,
                    display: props.style?.display ?? undefined,
                    position: "fixed",
                    top: 0,
                    right: 0,
                    height: "100dvh",
                    width: "40vw",
                    maxWidth: "60vw",
                    minWidth: 320,
                    zIndex: 9999,
                    transform: "translateX(0)",
                    transition:
                        "transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)",
                    visibility: "visible",
                    opacity: props.style?.opacity ?? 1,
                    pointerEvents: "auto",
                    overflow: props.style?.overflow ?? "hidden",
                }

        const backdropStyle: React.CSSProperties = {
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(0, 0, 0, 0.28)",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
            transition: "opacity 0.28s ease",
        }

        const closeCart = () => {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent(CART_CLOSE_EVENT))
            }
        }

        if (isCanvas) {
            return <Component ref={ref} {...props} style={drawerStyle} />
        }

        return (
            <>
                <div
                    aria-hidden="true"
                    onClick={closeCart}
                    style={backdropStyle}
                />
                <Component
                    ref={assignDrawerRef}
                    {...props}
                    role={props.role ?? "dialog"}
                    aria-modal={isOpen}
                    aria-hidden={!isOpen}
                    aria-label={props["aria-label"] ?? "Shopping cart"}
                    tabIndex={isOpen ? (props.tabIndex ?? -1) : -1}
                    style={drawerStyle}
                />
            </>
        )
    })
}

export function withOpenCanvasCart(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const { cart } = useCart()
        const count = React.useMemo(
            () =>
                cart.reduce((sum, line) => sum + Math.max(1, line.quantity), 0),
            [cart]
        )
        const showBadge = count > 0
        const badgeText = count > 99 ? "99+" : String(count)

        const openCart = React.useCallback(
            (event: any) => {
                callInteractionHandler(props.onTap, event)
                callInteractionHandler(props.onClick, event)
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent(CART_OPEN_EVENT))
                }
            },
            [props]
        )

        return (
            <div
                role="button"
                tabIndex={props.tabIndex ?? 0}
                aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"} in cart`}
                onKeyDown={activateOnKeyboard(openCart)}
                style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: props.style?.width,
                    height: props.style?.height,
                    cursor: props.style?.cursor ?? "pointer",
                    pointerEvents: props.style?.pointerEvents ?? "auto",
                }}
            >
                <Component
                    ref={ref}
                    {...props}
                    onTap={openCart}
                    onClick={openCart}
                    style={{
                        ...props.style,
                        cursor: props.style?.cursor ?? "pointer",
                        pointerEvents: props.style?.pointerEvents ?? "auto",
                    }}
                />
                {showBadge && (
                    <span
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            top: -5,
                            right: -6,
                            minWidth: 16,
                            height: 16,
                            padding: count > 9 ? "0 4px" : 0,
                            borderRadius: 4,
                            background: "#FF2D2D",
                            color: "#FFFFFF",
                            border: "1px solid #FFFFFF",
                            boxSizing: "border-box",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily:
                                'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            fontSize: 9,
                            fontWeight: 800,
                            lineHeight: 1,
                            letterSpacing: 0,
                            pointerEvents: "none",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                        }}
                    >
                        {badgeText}
                    </span>
                )}
            </div>
        )
    })
}

export function withCloseCanvasCart(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const closeCart = React.useCallback(
            (event: any) => {
                callInteractionHandler(props.onTap, event)
                callInteractionHandler(props.onClick, event)
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent(CART_CLOSE_EVENT))
                }
            },
            [props]
        )

        return (
            <Component
                ref={ref}
                {...props}
                onTap={closeCart}
                onClick={closeCart}
                role={props.role ?? "button"}
                tabIndex={props.tabIndex ?? 0}
                aria-label={props["aria-label"] ?? "Close cart"}
                onKeyDown={activateOnKeyboard(closeCart)}
                style={{
                    ...props.style,
                    cursor: props.style?.cursor ?? "pointer",
                    pointerEvents: props.style?.pointerEvents ?? "auto",
                }}
            />
        )
    })
}

export function withEmptyCartState(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const { cart } = useCart()
        const count = React.useMemo(
            () =>
                cart.reduce((sum, line) => sum + Math.max(0, line.quantity), 0),
            [cart]
        )
        const showEmptyState = count === 0 || isFramerCanvas()

        return (
            <Component
                ref={ref}
                {...props}
                aria-hidden={!showEmptyState}
                style={{
                    ...props.style,
                    display: showEmptyState
                        ? (props.style?.display ?? "flex")
                        : "none",
                }}
            />
        )
    })
}

export function withFilledCartState(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const { cart } = useCart()
        const count = React.useMemo(
            () =>
                cart.reduce((sum, line) => sum + Math.max(0, line.quantity), 0),
            [cart]
        )
        const showFilledState = count > 0 || isFramerCanvas()

        return (
            <Component
                ref={ref}
                {...props}
                aria-hidden={!showFilledState}
                style={{
                    ...props.style,
                    display: showFilledState
                        ? (props.style?.display ?? "flex")
                        : "none",
                }}
            />
        )
    })
}

export function withBeigeRow(Component: ComponentType): ComponentType {
    return withRowVisibility(Component, "beige")
}

export function withBlueRow(Component: ComponentType): ComponentType {
    return withRowVisibility(Component, "blue")
}

export function withRedRow(Component: ComponentType): ComponentType {
    return withRowVisibility(Component, "red")
}

export function withBeigeTitle(Component: ComponentType): ComponentType {
    return withRowText(Component, "beige", (line) => line?.title ?? "")
}

export function withBlueTitle(Component: ComponentType): ComponentType {
    return withRowText(Component, "blue", (line) => line?.title ?? "")
}

export function withRedTitle(Component: ComponentType): ComponentType {
    return withRowText(Component, "red", (line) => line?.title ?? "")
}

export function withBeigeSize(Component: ComponentType): ComponentType {
    return withRowText(Component, "beige", (line) =>
        line ? `UK ${line.size}` : ""
    )
}

export function withBlueSize(Component: ComponentType): ComponentType {
    return withRowText(Component, "blue", (line) =>
        line ? `UK ${line.size}` : ""
    )
}

export function withRedSize(Component: ComponentType): ComponentType {
    return withRowText(Component, "red", (line) =>
        line ? `UK ${line.size}` : ""
    )
}

export function withBeigeQuantity(Component: ComponentType): ComponentType {
    return withRowText(Component, "beige", (line) =>
        line ? String(line.quantity) : "0"
    )
}

export function withBlueQuantity(Component: ComponentType): ComponentType {
    return withRowText(Component, "blue", (line) =>
        line ? String(line.quantity) : "0"
    )
}

export function withRedQuantity(Component: ComponentType): ComponentType {
    return withRowText(Component, "red", (line) =>
        line ? String(line.quantity) : "0"
    )
}

export function withBeigePrice(Component: ComponentType): ComponentType {
    return withRowText(Component, "beige", (line) =>
        line ? toUSD(line.price * line.quantity) : toUSD(0)
    )
}

export function withBluePrice(Component: ComponentType): ComponentType {
    return withRowText(Component, "blue", (line) =>
        line ? toUSD(line.price * line.quantity) : toUSD(0)
    )
}

export function withRedPrice(Component: ComponentType): ComponentType {
    return withRowText(Component, "red", (line) =>
        line ? toUSD(line.price * line.quantity) : toUSD(0)
    )
}

export function withBeigeImage(Component: ComponentType): ComponentType {
    return withRowImage(Component, "beige")
}

export function withBlueImage(Component: ComponentType): ComponentType {
    return withRowImage(Component, "blue")
}

export function withRedImage(Component: ComponentType): ComponentType {
    return withRowImage(Component, "red")
}

export function withBeigeIncrease(Component: ComponentType): ComponentType {
    return withRowAction(Component, "beige", "increase")
}

export function withBlueIncrease(Component: ComponentType): ComponentType {
    return withRowAction(Component, "blue", "increase")
}

export function withRedIncrease(Component: ComponentType): ComponentType {
    return withRowAction(Component, "red", "increase")
}

export function withBeigeDecrease(Component: ComponentType): ComponentType {
    return withRowAction(Component, "beige", "decrease")
}

export function withBlueDecrease(Component: ComponentType): ComponentType {
    return withRowAction(Component, "blue", "decrease")
}

export function withRedDecrease(Component: ComponentType): ComponentType {
    return withRowAction(Component, "red", "decrease")
}

export function withBeigeRemove(Component: ComponentType): ComponentType {
    return withRowAction(Component, "beige", "remove")
}

export function withBlueRemove(Component: ComponentType): ComponentType {
    return withRowAction(Component, "blue", "remove")
}

export function withRedRemove(Component: ComponentType): ComponentType {
    return withRowAction(Component, "red", "remove")
}

export function withCartCount(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const { cart } = useCart()
        const count = React.useMemo(
            () =>
                cart.reduce((sum, line) => sum + Math.max(1, line.quantity), 0),
            [cart]
        )
        return (
            <Component ref={ref} {...props}>
                {count}
            </Component>
        )
    })
}

export function withSubtotal(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const { cart } = useCart()
        const subtotal = React.useMemo(
            () =>
                cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
            [cart]
        )
        return (
            <Component ref={ref} {...props}>
                {toUSD(subtotal)}
            </Component>
        )
    })
}

export function withTotal(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const { cart } = useCart()
        const total = React.useMemo(
            () =>
                cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
            [cart]
        )
        return (
            <Component ref={ref} {...props}>
                {toUSD(total)}
            </Component>
        )
    })
}

export function withDemoCheckout(Component: ComponentType): ComponentType {
    return forwardRef((props: any, ref) => {
        const onTap = React.useCallback(
            (event: any) => {
                if (props.onTap) props.onTap(event)
                writeCart([])
                if (typeof window !== "undefined") {
                    window.alert(
                        "Demo confirmation: checkout complete. Your local cart has been cleared."
                    )
                }
            },
            [props]
        )

        return (
            <Component
                ref={ref}
                {...props}
                onTap={onTap}
                role={props.role ?? "button"}
                tabIndex={props.tabIndex ?? 0}
                aria-label={props["aria-label"] ?? "Complete demo checkout"}
                onKeyDown={activateOnKeyboard(onTap)}
            />
        )
    })
}
