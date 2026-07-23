import * as React from "react"
import {
    addPropertyControls,
    ControlType,
    Link,
    useIsStaticRenderer,
} from "framer"

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

const CART_SYNC_EVENT = "stride-pulse-cart-sync"
const CART_OPEN_EVENT = "stride-cart-open"
const ACCENT_COLOR = "#2D6BFF"

function readCart(storageKey: string): CartLine[] {
    if (typeof window === "undefined") return []
    try {
        const raw = window.localStorage.getItem(storageKey)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed
            .map((item) => ({
                sku: String(item?.sku ?? ""),
                productId: String(item?.productId ?? ""),
                productCode: String(item?.productCode ?? ""),
                title: String(item?.title ?? "Untitled Product"),
                colorName: String(item?.colorName ?? "N/A"),
                size: String(item?.size ?? "00"),
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
            .filter((item) => item.sku)
    } catch (_error) {
        return []
    }
}

function writeCart(storageKey: string, cart: CartLine[]) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(storageKey, JSON.stringify(cart))
    window.dispatchEvent(
        new CustomEvent(CART_SYNC_EVENT, { detail: { storageKey } })
    )
}

function formatUSD(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value)
}

function useMeasuredWidth<T extends HTMLElement>() {
    const ref = React.useRef<T | null>(null)
    const [width, setWidth] = React.useState(0)

    React.useEffect(() => {
        if (typeof window === "undefined") return
        const node = ref.current
        if (!node) return

        const update = () => {
            React.startTransition(() =>
                setWidth(node.getBoundingClientRect().width)
            )
        }

        update()
        const observer = new ResizeObserver(update)
        observer.observe(node)
        return () => observer.disconnect()
    }, [])

    return { ref, width }
}

function useStrideCart(storageKey: string, disabled = false) {
    const [cart, setCart] = React.useState<CartLine[]>([])

    const refresh = React.useCallback(() => {
        if (disabled) return
        React.startTransition(() => setCart(readCart(storageKey)))
    }, [storageKey, disabled])

    React.useEffect(() => {
        refresh()
    }, [refresh])

    React.useEffect(() => {
        if (typeof window === "undefined" || disabled) return
        const onSync = (event: Event) => {
            const customEvent = event as CustomEvent<{ storageKey?: string }>
            if (
                !customEvent.detail?.storageKey ||
                customEvent.detail.storageKey === storageKey
            ) {
                refresh()
            }
        }
        window.addEventListener(CART_SYNC_EVENT, onSync as EventListener)
        window.addEventListener("storage", refresh)
        return () => {
            window.removeEventListener(CART_SYNC_EVENT, onSync as EventListener)
            window.removeEventListener("storage", refresh)
        }
    }, [refresh, storageKey, disabled])

    const replaceCart = React.useCallback(
        (nextCart: CartLine[]) => {
            React.startTransition(() => setCart(nextCart))
            writeCart(storageKey, nextCart)
        },
        [storageKey]
    )

    const addLine = React.useCallback(
        (line: CartLine) => {
            const current = readCart(storageKey)
            const index = current.findIndex((item) => item.sku === line.sku)
            const next = [...current]
            if (index >= 0) {
                next[index] = {
                    ...next[index],
                    quantity: Math.max(1, next[index].quantity + line.quantity),
                }
            } else {
                next.push({ ...line, quantity: Math.max(1, line.quantity) })
            }
            replaceCart(next)
        },
        [replaceCart, storageKey]
    )

    const updateQuantity = React.useCallback(
        (sku: string, delta: number) => {
            const next = cart.map((line) =>
                line.sku === sku
                    ? {
                          ...line,
                          quantity: Math.max(1, line.quantity + delta),
                      }
                    : line
            )
            replaceCart(next)
        },
        [cart, replaceCart]
    )

    const removeLine = React.useCallback(
        (sku: string) => {
            replaceCart(cart.filter((line) => line.sku !== sku))
        },
        [cart, replaceCart]
    )

    const clearCart = React.useCallback(() => {
        replaceCart([])
    }, [replaceCart])

    const itemCount = React.useMemo(
        () => cart.reduce((sum, line) => sum + Math.max(1, line.quantity), 0),
        [cart]
    )
    const subtotal = React.useMemo(
        () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
        [cart]
    )

    return {
        cart,
        addLine,
        updateQuantity,
        removeLine,
        clearCart,
        itemCount,
        subtotal,
    }
}

function CartToCheckIcon({
    active,
    size = 16,
}: {
    active: boolean
    size?: number
}) {
    return (
        <span
            aria-hidden="true"
            style={{
                position: "relative",
                width: size,
                height: size,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
            }}
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                focusable="false"
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: active ? 0 : 1,
                    transform: active
                        ? "translateX(4px) scale(0.72)"
                        : "translateX(0) scale(1)",
                    transition:
                        "opacity 0.2s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
            >
                <path
                    d="M6.2 7.5h13.2l-1.5 7.1a2.2 2.2 0 0 1-2.2 1.8H9.8a2.2 2.2 0 0 1-2.2-1.8L5.7 4.8H3.8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.85"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M9.6 20h.1M16.3 20h.1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                />
            </svg>
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                focusable="false"
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: active ? 1 : 0,
                    transform: active
                        ? "translateX(0) scale(1)"
                        : "translateX(-4px) scale(0.72)",
                    transition:
                        "opacity 0.2s ease 0.04s, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
            >
                <path
                    d="m5.2 12.4 4.3 4.1 9.3-9.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    )
}

interface FunctionalShoppingCartProps {
    backgroundColor: string
    summaryColor: string
    textColor: string
    mutedColor: string
    borderColor: string
    buttonColor: string
    buttonTextColor: string
    storeHref: string
    storageKey: string
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export function FunctionalShoppingCart(props: FunctionalShoppingCartProps) {
    const {
        backgroundColor,
        summaryColor,
        textColor,
        mutedColor,
        borderColor,
        buttonColor,
        buttonTextColor,
        storeHref,
        storageKey,
        style,
    } = props
    const isStatic = useIsStaticRenderer()
    const { ref, width } = useMeasuredWidth<HTMLDivElement>()
    const {
        cart,
        updateQuantity,
        removeLine,
        clearCart,
        itemCount,
        subtotal,
    } = useStrideCart(storageKey, isStatic)
    const [promo, setPromo] = React.useState("")
    const [isCheckedOut, setIsCheckedOut] = React.useState(false)
    const isPhone = width > 0 ? width < 720 : false
    const shipping = 0
    const tax = 0
    const total = subtotal + shipping + tax

    const checkout = React.useCallback(() => {
        clearCart()
        React.startTransition(() => setIsCheckedOut(true))
    }, [clearCart])

    return (
        <section
            ref={ref}
            style={{
                position: "relative",
                width: style?.width ?? "100%",
                height: style?.height ?? "100%",
                minHeight: 440,
                display: "flex",
                flexDirection: isPhone ? "column" : "row",
                overflow: "hidden",
                border: `1px solid ${borderColor}`,
                background: backgroundColor,
                color: textColor,
                ...style,
            }}
            aria-label="Shopping cart"
        >
            <div
                style={{
                    width: isPhone ? "100%" : "70%",
                    padding: 24,
                    background: backgroundColor,
                    boxSizing: "border-box",
                    borderRight: isPhone ? "none" : `1px solid ${borderColor}`,
                    borderBottom: isPhone ? `1px solid ${borderColor}` : "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontFamily:
                                '"Founders Grotesk", "Inter", sans-serif',
                            fontSize: 34,
                            letterSpacing: "-0.03em",
                            lineHeight: 1,
                        }}
                    >
                        Your Bag
                    </h2>
                    <Link
                        href={storeHref}
                        style={{
                            color: mutedColor,
                            textDecoration: "none",
                            fontFamily: "Inter, sans-serif",
                            fontSize: 14,
                        }}
                    >
                        Back to Store
                    </Link>
                </div>
                <span
                    style={{
                        fontFamily: "Inter, sans-serif",
                        color: mutedColor,
                        fontSize: 14,
                    }}
                >
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                </span>

                {isCheckedOut ? (
                    <div
                        role="status"
                        aria-live="polite"
                        style={{
                            border: `1px solid ${borderColor}`,
                            borderRadius: 14,
                            padding: 20,
                            fontFamily: "Inter, sans-serif",
                            background: "#FFFFFF",
                        }}
                    >
                        <strong style={{ display: "block", marginBottom: 6 }}>
                            Order confirmed (demo)
                        </strong>
                        <span style={{ color: mutedColor }}>
                            Checkout complete. Your local cart was cleared.
                        </span>
                    </div>
                ) : cart.length === 0 ? (
                    <div
                        role="status"
                        aria-live="polite"
                        style={{
                            border: `1px dashed ${borderColor}`,
                            borderRadius: 14,
                            padding: 28,
                            fontFamily: "Inter, sans-serif",
                            color: mutedColor,
                        }}
                    >
                        Your cart is empty.
                    </div>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                        }}
                    >
                        {cart.map((line) => (
                            <article
                                key={line.sku}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "96px 1fr auto",
                                    gap: 14,
                                    border: `1px solid ${borderColor}`,
                                    borderRadius: 14,
                                    padding: 12,
                                    alignItems: "center",
                                }}
                            >
                                <img
                                    src={line.image?.src}
                                    srcSet={line.image?.srcSet}
                                    alt={
                                        line.image?.alt ||
                                        `${line.title} product image`
                                    }
                                    style={{
                                        width: 96,
                                        height: 96,
                                        borderRadius: 10,
                                        objectFit: "cover",
                                        background: "#F5F5F5",
                                    }}
                                />
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 6,
                                        minWidth: 0,
                                    }}
                                >
                                    <strong
                                        style={{
                                            fontFamily: "Inter, sans-serif",
                                            fontSize: 15,
                                        }}
                                    >
                                        {line.title}
                                    </strong>
                                    <span
                                        style={{
                                            fontFamily: "Inter, sans-serif",
                                            fontSize: 13,
                                            color: mutedColor,
                                        }}
                                    >
                                        {line.colorName} · UK {line.size}
                                    </span>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            alignItems: "center",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateQuantity(line.sku, -1)
                                            }
                                            aria-label={`Decrease quantity for ${line.title}`}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 999,
                                                border: `1px solid ${borderColor}`,
                                                background: "transparent",
                                                cursor: "pointer",
                                            }}
                                        >
                                            −
                                        </button>
                                        <span
                                            aria-live="polite"
                                            aria-label={`Quantity: ${line.quantity}`}
                                            style={{
                                                fontFamily: "Inter, sans-serif",
                                                minWidth: 18,
                                                textAlign: "center",
                                            }}
                                        >
                                            {line.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateQuantity(line.sku, 1)
                                            }
                                            aria-label={`Increase quantity for ${line.title}`}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 999,
                                                border: `1px solid ${borderColor}`,
                                                background: "transparent",
                                                cursor: "pointer",
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-end",
                                        gap: 8,
                                    }}
                                >
                                    <strong
                                        style={{
                                            fontFamily: "Inter, sans-serif",
                                            fontSize: 14,
                                        }}
                                    >
                                        {formatUSD(line.price * line.quantity)}
                                    </strong>
                                    <button
                                        type="button"
                                        onClick={() => removeLine(line.sku)}
                                        aria-label={`Remove ${line.title} from cart`}
                                        style={{
                                            fontFamily: "Inter, sans-serif",
                                            fontSize: 13,
                                            border: "none",
                                            background: "transparent",
                                            color: mutedColor,
                                            cursor: "pointer",
                                            textDecoration: "underline",
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <aside
                style={{
                    width: isPhone ? "100%" : "30%",
                    background: summaryColor,
                    padding: 24,
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                }}
                aria-label="Order summary"
            >
                <h3
                    style={{
                        margin: 0,
                        fontFamily: '"Founders Grotesk", "Inter", sans-serif',
                        fontSize: 26,
                        letterSpacing: "-0.02em",
                    }}
                >
                    Summary
                </h3>
                <label
                    style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        color: mutedColor,
                    }}
                >
                    Promo code
                    <input
                        value={promo}
                        onChange={(event) => {
                            const next = event.target.value
                            React.startTransition(() => setPromo(next))
                        }}
                        placeholder="Enter code"
                        style={{
                            marginTop: 6,
                            width: "100%",
                            height: 36,
                            borderRadius: 10,
                            border: `1px solid ${borderColor}`,
                            padding: "0 10px",
                            boxSizing: "border-box",
                            fontFamily: "Inter, sans-serif",
                        }}
                    />
                </label>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                    }}
                >
                    <span style={{ color: mutedColor }}>Subtotal</span>
                    <span>{formatUSD(subtotal)}</span>
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                    }}
                >
                    <span style={{ color: mutedColor }}>Shipping</span>
                    <span>Free</span>
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                    }}
                >
                    <span style={{ color: mutedColor }}>Tax</span>
                    <span>{formatUSD(tax)}</span>
                </div>
                <div
                    style={{
                        borderTop: `1px solid ${borderColor}`,
                        marginTop: 6,
                        paddingTop: 10,
                        display: "flex",
                        justifyContent: "space-between",
                    }}
                >
                    <strong
                        style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 15,
                        }}
                    >
                        Total
                    </strong>
                    <strong
                        style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 15,
                        }}
                    >
                        {formatUSD(total)}
                    </strong>
                </div>

                <button
                    type="button"
                    onClick={checkout}
                    disabled={cart.length === 0 || isCheckedOut}
                    style={{
                        marginTop: 8,
                        height: 44,
                        border: "none",
                        borderRadius: 999,
                        background: buttonColor,
                        color: buttonTextColor,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        cursor:
                            cart.length === 0 || isCheckedOut
                                ? "not-allowed"
                                : "pointer",
                        opacity: cart.length === 0 || isCheckedOut ? 0.6 : 1,
                    }}
                >
                    Checkout
                </button>

                <Link
                    href={storeHref}
                    style={{
                        color: mutedColor,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        textDecoration: "none",
                    }}
                >
                    ← Continue shopping
                </Link>
            </aside>
        </section>
    )
}

addPropertyControls(FunctionalShoppingCart, {
    backgroundColor: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    summaryColor: { type: ControlType.Color, defaultValue: "#FAFAFA" },
    textColor: { type: ControlType.Color, defaultValue: "#000000" },
    mutedColor: { type: ControlType.Color, defaultValue: "#CCCCCC" },
    borderColor: { type: ControlType.Color, defaultValue: "#EEEEEE" },
    buttonColor: { type: ControlType.Color, defaultValue: "#000000" },
    buttonTextColor: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    storeHref: { type: ControlType.Link, defaultValue: "/" },
    storageKey: { type: ControlType.String, defaultValue: "stride-pulse-cart" },
})

interface ProductPurchaseActionsProps {
    productId: string
    productCode: string
    title: string
    colorName: string
    image?: { src?: string; srcSet?: string; alt?: string }
    price: number
    availableSizes: string
    storageKey: string
    cartHref: string
    backgroundColor: string
    textColor: string
    mutedColor: string
    borderColor: string
    primaryButtonColor: string
    primaryButtonTextColor: string
    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function ProductPurchaseActions(
    props: ProductPurchaseActionsProps
) {
    const {
        productId,
        productCode,
        title,
        colorName,
        image = {
            src: "https://framerusercontent.com/images/f9RiWoNpmlCMqVRIHz8l8wYfeI.jpg",
            alt: "Stride Pulse product image",
        },
        price,
        availableSizes,
        storageKey,
        cartHref,
        backgroundColor,
        textColor,
        mutedColor,
        borderColor,
        primaryButtonColor,
        primaryButtonTextColor,
        style,
    } = props
    const [selectedSize, setSelectedSize] = React.useState("")
    const [validation, setValidation] = React.useState("")
    const [feedback, setFeedback] = React.useState("")
    const [cartActive, setCartActive] = React.useState(false)
    const { addLine } = useStrideCart(storageKey)

    const sizes = React.useMemo(
        () =>
            availableSizes
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
        [availableSizes]
    )

    const addToCart = React.useCallback(() => {
        if (!selectedSize) {
            React.startTransition(() =>
                setValidation("Please select a UK size before continuing.")
            )
            return
        }

        const sku = `${productCode}-UK${selectedSize}`
        addLine({
            sku,
            productId,
            productCode,
            title,
            colorName,
            size: selectedSize,
            quantity: 1,
            price,
            image,
        })
        React.startTransition(() => {
            setValidation("")
            setFeedback("Added to cart.")
            setCartActive(true)
        })
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent(CART_OPEN_EVENT))
            window.setTimeout(() => {
                React.startTransition(() => {
                    setFeedback("")
                    setCartActive(false)
                })
            }, 1100)
        }
    }, [
        selectedSize,
        productCode,
        storageKey,
        productId,
        title,
        colorName,
        price,
        image,
        addLine,
    ])

    const hasSelectedSize = Boolean(selectedSize)

    return (
        <section
            style={{
                position: "relative",
                width: style?.width ?? "100%",
                height: style?.height ?? "auto",
                background: backgroundColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 16,
                padding: 14,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                ...style,
            }}
            aria-label="Product purchase actions"
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    fontFamily: "Inter, sans-serif",
                }}
            >
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 3 }}
                >
                    <span
                        style={{
                            color: textColor,
                            fontSize: 13,
                            fontWeight: 700,
                        }}
                    >
                        UK Size
                    </span>
                    <span style={{ color: mutedColor, fontSize: 11 }}>
                        Choose your fit
                    </span>
                </div>
                <span
                    style={{
                        minHeight: 24,
                        padding: "5px 10px",
                        borderRadius: 999,
                        border: `1px solid ${hasSelectedSize ? ACCENT_COLOR : borderColor}`,
                        color: hasSelectedSize ? ACCENT_COLOR : mutedColor,
                        background: hasSelectedSize
                            ? "rgba(45,107,255,0.08)"
                            : "transparent",
                        fontSize: 11,
                        fontWeight: 700,
                        boxSizing: "border-box",
                    }}
                >
                    {hasSelectedSize ? `UK ${selectedSize}` : "Required"}
                </span>
            </div>

            <div
                role="radiogroup"
                aria-label="Select UK shoe size"
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 8,
                }}
            >
                {sizes.map((size) => {
                    const selected = size === selectedSize
                    return (
                        <button
                            key={size}
                            type="button"
                            onClick={() => {
                                React.startTransition(() => {
                                    setSelectedSize(size)
                                    setValidation("")
                                })
                            }}
                            aria-pressed={selected}
                            aria-label={`Select UK size ${size}`}
                            style={{
                                position: "relative",
                                height: 44,
                                borderRadius: 12,
                                border: `1px solid ${selected ? ACCENT_COLOR : borderColor}`,
                                background: selected
                                    ? ACCENT_COLOR
                                    : "rgba(0,0,0,0.018)",
                                color: selected ? "#FFFFFF" : textColor,
                                fontFamily: "Inter, sans-serif",
                                fontSize: 13,
                                fontWeight: 750,
                                cursor: "pointer",
                                boxShadow: selected
                                    ? "0 6px 16px rgba(45,107,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.22)"
                                    : "inset 0 0 0 1px rgba(255,255,255,0.7)",
                                transform: selected
                                    ? "translateY(-1px)"
                                    : "translateY(0)",
                                transition:
                                    "transform 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
                                WebkitTapHighlightColor: "transparent",
                            }}
                            onMouseEnter={(event) => {
                                if (selected) return
                                event.currentTarget.style.transform =
                                    "translateY(-1px)"
                                event.currentTarget.style.borderColor =
                                    ACCENT_COLOR
                            }}
                            onMouseLeave={(event) => {
                                if (selected) return
                                event.currentTarget.style.transform =
                                    "translateY(0)"
                                event.currentTarget.style.borderColor =
                                    borderColor
                            }}
                            onMouseDown={(event) => {
                                event.currentTarget.style.transform =
                                    "translateY(1px) scale(0.98)"
                            }}
                            onMouseUp={(event) => {
                                event.currentTarget.style.transform = selected
                                    ? "translateY(-1px)"
                                    : "translateY(0)"
                            }}
                        >
                            {size}
                        </button>
                    )
                })}
            </div>

            {validation ? (
                <span
                    role="alert"
                    style={{
                        color: "#B00020",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                    }}
                >
                    {validation}
                </span>
            ) : null}

            {feedback ? (
                <span
                    role="status"
                    aria-live="polite"
                    style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: textColor,
                    }}
                >
                    {feedback}
                </span>
            ) : null}

            <button
                type="button"
                onClick={addToCart}
                aria-label={
                    hasSelectedSize
                        ? `Add ${title} in UK size ${selectedSize} to cart`
                        : `Select a UK size before adding ${title} to cart`
                }
                style={{
                    height: 46,
                    borderRadius: 10,
                    border: "none",
                    background: primaryButtonColor,
                    color: primaryButtonTextColor,
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    fontWeight: 750,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: cartActive
                        ? "0 5px 14px rgba(45,107,255,0.18)"
                        : "0 3px 10px rgba(45,107,255,0.14)",
                    transform: cartActive
                        ? "translateY(0) scale(0.99)"
                        : "scale(1)",
                    transition:
                        "transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease",
                    WebkitTapHighlightColor: "transparent",
                }}
                onMouseEnter={(event) => {
                    event.currentTarget.style.transform = cartActive
                        ? "scale(0.99)"
                        : "translateY(-1px)"
                    event.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(45,107,255,0.2)"
                }}
                onMouseLeave={(event) => {
                    event.currentTarget.style.transform = cartActive
                        ? "scale(0.99)"
                        : "scale(1)"
                    event.currentTarget.style.boxShadow = cartActive
                        ? "0 5px 14px rgba(45,107,255,0.18)"
                        : "0 3px 10px rgba(45,107,255,0.14)"
                }}
                onMouseDown={(event) => {
                    event.currentTarget.style.transform =
                        "translateY(1px) scale(0.985)"
                }}
                onMouseUp={(event) => {
                    event.currentTarget.style.transform = cartActive
                        ? "scale(0.99)"
                        : "translateY(-1px)"
                }}
            >
                <CartToCheckIcon active={cartActive} />
                {cartActive ? "Added to Cart" : "Add to Cart"}
            </button>
        </section>
    )
}

addPropertyControls(ProductPurchaseActions, {
    productId: { type: ControlType.String, defaultValue: "stride-pulse-01" },
    productCode: { type: ControlType.String, defaultValue: "SP-CORE-GRN" },
    title: { type: ControlType.String, defaultValue: "Stride Pulse Runner" },
    colorName: { type: ControlType.String, defaultValue: "Forest Green" },
    image: { type: ControlType.ResponsiveImage },
    price: {
        type: ControlType.Number,
        defaultValue: 149,
        min: 0,
        max: 999,
        step: 1,
    },
    availableSizes: {
        type: ControlType.String,
        defaultValue: "04,05,06,07,08,09,10",
    },
    storageKey: { type: ControlType.String, defaultValue: "stride-pulse-cart" },
    cartHref: { type: ControlType.Link, defaultValue: "/cart" },
    backgroundColor: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    textColor: { type: ControlType.Color, defaultValue: "#000000" },
    mutedColor: { type: ControlType.Color, defaultValue: "#CCCCCC" },
    borderColor: { type: ControlType.Color, defaultValue: "#EEEEEE" },
    primaryButtonColor: { type: ControlType.Color, defaultValue: ACCENT_COLOR },
    primaryButtonTextColor: {
        type: ControlType.Color,
        defaultValue: "#FFFFFF",
    },
})
