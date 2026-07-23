import * as React from "react"
import {
    addPropertyControls,
    ControlType,
    RenderTarget,
    useIsStaticRenderer,
} from "framer"
import {
    animate,
    motion,
    useMotionValue,
    useMotionValueEvent,
    useReducedMotion,
} from "framer-motion"

interface InfiniteVariableCarouselProps {
    cards?: React.ReactNode
    cardWidth: number
    cardHeight: number
    gap: number
    renderRadius: number
    sideScale: number
    sideOpacity: number
    snapStiffness: number
    snapDamping: number
    dragPower: number
    wheelSensitivity: number
    showControls: boolean
    controlSize: number
    controlsSpacing: number
    arrowColor: string
    arrowBackground: string
    arrowBorder: string
    background: string
}

function wrapIndex(index: number, length: number) {
    return ((index % length) + length) % length
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

function PlaceholderCard({ label }: { label: string }) {
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                background: "#F9FAFB",
                color: "#111827",
                fontFamily:
                    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: 15,
                fontWeight: 600,
            }}
        >
            {label}
        </div>
    )
}

function ChevronIcon({
    direction,
    size,
}: {
    direction: "left" | "right"
    size: number
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path
                d={
                    direction === "left"
                        ? "M15 18L9 12L15 6"
                        : "M9 18L15 12L9 6"
                }
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function InfiniteVariableCarousel(
    props: InfiniteVariableCarouselProps
) {
    const {
        cards,
        cardWidth,
        cardHeight,
        gap,
        renderRadius,
        sideScale,
        sideOpacity,
        snapStiffness,
        snapDamping,
        dragPower,
        wheelSensitivity,
        showControls,
        controlSize,
        controlsSpacing,
        arrowColor,
        arrowBackground,
        arrowBorder,
        background,
    } = props

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const isStatic = useIsStaticRenderer()
    const prefersReducedMotion = useReducedMotion()
    const attachedCards = React.Children.toArray(cards).filter(Boolean)
    const fallbackCards = React.useMemo(
        () => [
            <PlaceholderCard key="one" label="Attach card 1" />,
            <PlaceholderCard key="two" label="Attach card 2" />,
            <PlaceholderCard key="three" label="Attach card 3" />,
        ],
        []
    )
    const items = attachedCards.length > 0 ? attachedCards : fallbackCards
    const itemCount = items.length
    const step = Math.max(1, cardWidth + gap)
    const canInteract = itemCount > 1 && !isStatic && !isCanvas
    const requestedRadius = Math.max(1, Math.round(renderRadius))
    const maxUniqueRadius =
        itemCount <= 2 ? 1 : Math.max(1, Math.floor((itemCount - 1) / 2))
    const safeRadius = Math.min(requestedRadius, maxUniqueRadius)
    const safeControlSize = Math.max(32, controlSize)
    const safeControlsSpacing = Math.max(0, controlsSpacing)
    const controlsOffset = showControls
        ? safeControlSize + safeControlsSpacing
        : 0
    const iconSize = Math.max(20, Math.round(safeControlSize * 0.46))

    const position = useMotionValue(0)
    const [viewPosition, setViewPosition] = React.useState(0)
    const animationRef = React.useRef<{ stop: () => void } | null>(null)
    const wheelSettleRef = React.useRef<number | null>(null)
    const targetRef = React.useRef(0)
    const dragStateRef = React.useRef({
        active: false,
        pointerId: -1,
        startX: 0,
        startPosition: 0,
        lastX: 0,
        lastTime: 0,
        velocityX: 0,
    })

    useMotionValueEvent(position, "change", (latest) => {
        setViewPosition(latest)
    })

    React.useEffect(() => {
        return () => {
            animationRef.current?.stop()
            if (wheelSettleRef.current !== null) {
                window.clearTimeout(wheelSettleRef.current)
            }
        }
    }, [])

    function stopAnimation() {
        animationRef.current?.stop()
        animationRef.current = null
    }

    function animateTo(target: number) {
        stopAnimation()
        targetRef.current = target

        if (prefersReducedMotion) {
            position.set(target)
            setViewPosition(target)
            return
        }

        animationRef.current = animate(position, target, {
            type: "spring",
            stiffness: snapStiffness,
            damping: snapDamping,
            mass: 0.9,
        })
    }

    function snapToNearest(velocityX = 0) {
        const projected =
            position.get() - (velocityX / step) * clamp(dragPower, 0, 0.6)
        animateTo(Math.round(projected))
    }

    function moveBy(delta: number) {
        if (!canInteract) return

        const currentTarget = animationRef.current
            ? targetRef.current
            : Math.round(position.get())
        animateTo(currentTarget + delta)
    }

    function handleWheel(event: React.WheelEvent<HTMLElement>) {
        if (!canInteract) return

        const rawDelta =
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
                ? event.deltaX
                : event.deltaY
        if (Math.abs(rawDelta) < 0.5) return

        event.preventDefault()
        stopAnimation()

        const delta = clamp(rawDelta, -90, 90)
        const next = position.get() + (delta / step) * wheelSensitivity
        position.set(next)
        targetRef.current = next

        if (wheelSettleRef.current !== null) {
            window.clearTimeout(wheelSettleRef.current)
        }
        wheelSettleRef.current = window.setTimeout(() => {
            snapToNearest()
            wheelSettleRef.current = null
        }, 120)
    }

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
        if (!canInteract || event.button !== 0) return

        stopAnimation()
        event.currentTarget.setPointerCapture(event.pointerId)

        dragStateRef.current = {
            active: true,
            pointerId: event.pointerId,
            startX: event.clientX,
            startPosition: position.get(),
            lastX: event.clientX,
            lastTime: event.timeStamp,
            velocityX: 0,
        }
    }

    function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        const dragState = dragStateRef.current
        if (!dragState.active || dragState.pointerId !== event.pointerId) return

        const offsetX = event.clientX - dragState.startX
        position.set(dragState.startPosition - offsetX / step)

        const elapsed = Math.max(1, event.timeStamp - dragState.lastTime)
        dragState.velocityX =
            ((event.clientX - dragState.lastX) / elapsed) * 1000
        dragState.lastX = event.clientX
        dragState.lastTime = event.timeStamp
    }

    function finishPointerDrag(event: React.PointerEvent<HTMLDivElement>) {
        const dragState = dragStateRef.current
        if (!dragState.active || dragState.pointerId !== event.pointerId) return

        dragState.active = false
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
        snapToNearest(dragState.velocityX)
    }

    const nearestVirtualIndex = Math.round(viewPosition)
    const virtualSlots = React.useMemo(() => {
        if (itemCount <= 1) return [0]
        if (itemCount === 2) {
            const direction = viewPosition >= nearestVirtualIndex ? 1 : -1
            return [nearestVirtualIndex, nearestVirtualIndex + direction]
        }

        const slots: number[] = []
        for (
            let virtualIndex = nearestVirtualIndex - safeRadius;
            virtualIndex <= nearestVirtualIndex + safeRadius;
            virtualIndex++
        ) {
            slots.push(virtualIndex)
        }
        return slots
    }, [itemCount, nearestVirtualIndex, safeRadius])

    const arrowStyle: React.CSSProperties = {
        width: safeControlSize,
        height: safeControlSize,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        borderRadius: 999,
        border: `1px solid ${arrowBorder}`,
        color: arrowColor,
        background: arrowBackground,
        cursor: canInteract ? "pointer" : "default",
        opacity: canInteract ? 1 : 0.45,
        boxShadow: "0 8px 22px rgba(15, 23, 42, 0.08)",
        WebkitTapHighlightColor: "transparent",
    }

    return (
        <section
            aria-roledescription="carousel"
            onWheel={handleWheel}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 240,
                minHeight: cardHeight + controlsOffset + 16,
                overflow: "visible",
                background,
                userSelect: canInteract ? "none" : "auto",
                touchAction: canInteract ? "pan-y" : "auto",
            }}
        >
            {showControls && (
                <nav
                    aria-label="Carousel controls"
                    style={{
                        position: "relative",
                        zIndex: 10,
                        height: safeControlSize,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                    }}
                >
                    <motion.button
                        type="button"
                        aria-label="Previous card"
                        disabled={!canInteract}
                        onClick={() => moveBy(-1)}
                        style={arrowStyle}
                        whileHover={canInteract ? { y: -1, scale: 1.04 } : {}}
                        whileTap={canInteract ? { scale: 0.96 } : {}}
                    >
                        <ChevronIcon direction="left" size={iconSize} />
                    </motion.button>
                    <motion.button
                        type="button"
                        aria-label="Next card"
                        disabled={!canInteract}
                        onClick={() => moveBy(1)}
                        style={arrowStyle}
                        whileHover={canInteract ? { y: -1, scale: 1.04 } : {}}
                        whileTap={canInteract ? { scale: 0.96 } : {}}
                    >
                        <ChevronIcon direction="right" size={iconSize} />
                    </motion.button>
                </nav>
            )}

            <motion.div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishPointerDrag}
                onPointerCancel={finishPointerDrag}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: controlsOffset,
                    height: cardHeight,
                    cursor: canInteract ? "grab" : "default",
                    overflow: "visible",
                }}
                whileTap={canInteract ? { cursor: "grabbing" } : {}}
            >
                {virtualSlots.map((virtualIndex) => {
                    const itemIndex = wrapIndex(virtualIndex, itemCount)
                    const distance = virtualIndex - viewPosition
                    const absDistance = Math.abs(distance)
                    const isCenter = virtualIndex === nearestVirtualIndex
                    const scale = 1 - Math.min(1, absDistance) * (1 - sideScale)
                    const opacity =
                        1 - Math.min(1, absDistance) * (1 - sideOpacity)
                    const zIndex = Math.round(1000 - absDistance * 100)
                    const card = items[itemIndex]

                    return (
                        <motion.div
                            key={virtualIndex}
                            aria-hidden={!isCenter}
                            style={{
                                position: "absolute",
                                left: "50%",
                                top: 0,
                                width: cardWidth,
                                height: cardHeight,
                                x: distance * step - cardWidth / 2,
                                scale,
                                opacity,
                                zIndex,
                                pointerEvents: "auto",
                                overflow: "visible",
                            }}
                        >
                            <div
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    height: "100%",
                                    overflow: "visible",
                                }}
                            >
                                {card}
                            </div>
                        </motion.div>
                    )
                })}
            </motion.div>
        </section>
    )
}

addPropertyControls(InfiniteVariableCarousel, {
    cards: {
        type: ControlType.Slot,
        title: "Cards",
    },
    cardWidth: {
        type: ControlType.Number,
        title: "Card Width",
        defaultValue: 320,
        min: 120,
        max: 1200,
        step: 1,
        unit: "px",
    },
    cardHeight: {
        type: ControlType.Number,
        title: "Card Height",
        defaultValue: 420,
        min: 120,
        max: 1200,
        step: 1,
        unit: "px",
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
        defaultValue: 24,
        min: 0,
        max: 240,
        step: 1,
        unit: "px",
    },
    renderRadius: {
        type: ControlType.Number,
        title: "Visible Each Side",
        defaultValue: 4,
        min: 1,
        max: 8,
        step: 1,
    },
    sideScale: {
        type: ControlType.Number,
        title: "Side Scale",
        defaultValue: 0.9,
        min: 0.5,
        max: 1,
        step: 0.01,
    },
    sideOpacity: {
        type: ControlType.Number,
        title: "Side Opacity",
        defaultValue: 0.62,
        min: 0.1,
        max: 1,
        step: 0.01,
    },
    snapStiffness: {
        type: ControlType.Number,
        title: "Snap Stiffness",
        defaultValue: 260,
        min: 60,
        max: 700,
        step: 10,
    },
    snapDamping: {
        type: ControlType.Number,
        title: "Snap Damping",
        defaultValue: 32,
        min: 10,
        max: 80,
        step: 1,
    },
    dragPower: {
        type: ControlType.Number,
        title: "Drag Power",
        defaultValue: 0.22,
        min: 0,
        max: 0.6,
        step: 0.01,
    },
    wheelSensitivity: {
        type: ControlType.Number,
        title: "Wheel Sens.",
        defaultValue: 0.85,
        min: 0.1,
        max: 2,
        step: 0.05,
    },
    showControls: {
        type: ControlType.Boolean,
        title: "Controls",
        defaultValue: true,
    },
    controlSize: {
        type: ControlType.Number,
        title: "Control Size",
        defaultValue: 52,
        min: 32,
        max: 96,
        step: 1,
        unit: "px",
    },
    controlsSpacing: {
        type: ControlType.Number,
        title: "Controls Space",
        defaultValue: 28,
        min: 0,
        max: 120,
        step: 1,
        unit: "px",
    },
    arrowColor: {
        type: ControlType.Color,
        title: "Arrow Color",
        defaultValue: "#111827",
    },
    arrowBackground: {
        type: ControlType.Color,
        title: "Arrow Fill",
        defaultValue: "#FFFFFF",
    },
    arrowBorder: {
        type: ControlType.Color,
        title: "Arrow Border",
        defaultValue: "#E5E7EB",
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "rgba(255,255,255,0)",
    },
})
