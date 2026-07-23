import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import {
    AnimatePresence,
    animate,
    motion,
    useMotionValue,
    useReducedMotion,
} from "framer-motion"

type ResponsiveImage = {
    src?: string
    srcSet?: string
    alt?: string
}

interface MobileProductImageCarouselProps {
    image1?: ResponsiveImage
    image2?: ResponsiveImage
    image3?: ResponsiveImage
    image4?: ResponsiveImage
    image5?: ResponsiveImage
    image6?: ResponsiveImage
    background: string
    lightboxBackground: string
    radius: number
    showDots: boolean
    dotColor: string
    activeDotColor: string
    dragThreshold: number
    style?: React.CSSProperties
}

type DragInfo = {
    offset: { x: number }
    velocity: { x: number }
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

function getImageSrc(image?: ResponsiveImage) {
    return image?.src || ""
}

function useElementWidth<T extends HTMLElement>() {
    const [node, setNode] = React.useState<T | null>(null)
    const [width, setWidth] = React.useState(1)

    const ref = React.useCallback((element: T | null) => {
        setNode(element)
    }, [])

    React.useEffect(() => {
        if (!node) return

        let frame = 0

        const update = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => {
                setWidth(Math.max(1, node.getBoundingClientRect().width))
            })
        }

        update()

        if (typeof ResizeObserver === "undefined") {
            if (typeof window === "undefined") return
            window.addEventListener("resize", update)
            return () => {
                cancelAnimationFrame(frame)
                window.removeEventListener("resize", update)
            }
        }

        const observer = new ResizeObserver(update)
        observer.observe(node)

        return () => {
            cancelAnimationFrame(frame)
            observer.disconnect()
        }
    }, [node])

    return [ref, width] as const
}

function ProductImage({
    image,
    radius,
    onClick,
}: {
    image: ResponsiveImage
    radius: number
    onClick?: () => void
}) {
    const src = getImageSrc(image)

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Open product image"
            style={{
                width: "100%",
                height: "100%",
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: onClick ? "zoom-in" : "default",
                display: "block",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
            }}
        >
            {src ? (
                <img
                    src={src}
                    srcSet={image.srcSet}
                    alt={image.alt || "Product image"}
                    draggable={false}
                    decoding="async"
                    loading="eager"
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                        objectFit: "cover",
                        objectPosition: "center",
                        borderRadius: radius,
                        userSelect: "none",
                        pointerEvents: "none",
                        transform: "translateZ(0)",
                        backfaceVisibility: "hidden",
                    }}
                />
            ) : (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: radius,
                        background:
                            "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6B7280",
                        fontFamily:
                            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        fontSize: 13,
                        fontWeight: 700,
                    }}
                >
                    Add image
                </div>
            )}
        </button>
    )
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function MobileProductImageCarousel(
    props: MobileProductImageCarouselProps
) {
    const {
        image1 = {
            src: "https://framerusercontent.com/images/f9RiWoNpmlCMqVRIHz8l8wYfeI.jpg",
            alt: "Product image 1",
        },
        image2,
        image3,
        image4,
        image5,
        image6,
        background,
        lightboxBackground,
        radius,
        showDots,
        dotColor,
        activeDotColor,
        dragThreshold,
        style,
    } = props

    const images = React.useMemo(
        () =>
            [image1, image2, image3, image4, image5, image6].filter((image) =>
                Boolean(getImageSrc(image))
            ) as ResponsiveImage[],
        [image1, image2, image3, image4, image5, image6]
    )

    const items =
        images.length > 0
            ? images
            : [
                  {
                      src: "",
                      alt: "Product image",
                  },
              ]

    const imageCount = items.length
    const maxIndex = Math.max(0, imageCount - 1)
    const prefersReducedMotion = useReducedMotion()

    const [index, setIndex] = React.useState(0)
    const [lightboxOpen, setLightboxOpen] = React.useState(false)

    const [carouselRef, carouselWidth] = useElementWidth<HTMLDivElement>()
    const [lightboxFrameRef, lightboxWidth] = useElementWidth<HTMLDivElement>()

    const x = useMotionValue(0)
    const lightboxX = useMotionValue(0)

    const carouselControls = React.useRef<any>(null)
    const lightboxControls = React.useRef<any>(null)
    const ignoreClickUntilRef = React.useRef(0)

    React.useEffect(() => {
        setIndex((current) => clamp(current, 0, maxIndex))
    }, [maxIndex])

    React.useEffect(() => {
        x.set(-index * carouselWidth)
    }, [carouselWidth, index, x])

    React.useEffect(() => {
        if (!lightboxOpen) return
        lightboxX.set(-index * lightboxWidth)
    }, [lightboxOpen, lightboxWidth, index, lightboxX])

    React.useEffect(() => {
        if (!lightboxOpen || typeof document === "undefined") return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [lightboxOpen])

    React.useEffect(() => {
        if (!lightboxOpen || typeof window === "undefined") return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setLightboxOpen(false)
            if (event.key === "ArrowLeft") goTo(index - 1)
            if (event.key === "ArrowRight") goTo(index + 1)
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [lightboxOpen, index, carouselWidth, lightboxWidth])

    function animateTrack(
        value: any,
        controlsRef: React.MutableRefObject<any>,
        target: number
    ) {
        controlsRef.current?.stop?.()

        if (prefersReducedMotion) {
            value.set(target)
            return
        }

        controlsRef.current = animate(value, target, {
            type: "spring",
            stiffness: 430,
            damping: 44,
            mass: 0.72,
            restDelta: 0.4,
            restSpeed: 16,
        })
    }

    function goTo(nextIndex: number) {
        const safeIndex = clamp(nextIndex, 0, maxIndex)

        setIndex(safeIndex)
        animateTrack(x, carouselControls, -safeIndex * carouselWidth)

        if (lightboxOpen) {
            animateTrack(
                lightboxX,
                lightboxControls,
                -safeIndex * lightboxWidth
            )
        }
    }

    function getSwipeIndex(
        currentIndex: number,
        info: DragInfo,
        currentX: number,
        width: number
    ) {
        if (imageCount <= 1 || width <= 1) return currentIndex

        const threshold = Math.max(18, dragThreshold)
        const velocityThreshold = 420

        if (
            info.offset.x <= -threshold ||
            info.velocity.x <= -velocityThreshold
        ) {
            return currentIndex + 1
        }

        if (
            info.offset.x >= threshold ||
            info.velocity.x >= velocityThreshold
        ) {
            return currentIndex - 1
        }

        return Math.round(Math.abs(currentX) / width)
    }

    function handleCarouselDragStart() {
        carouselControls.current?.stop?.()
    }

    function handleCarouselDragEnd(_: unknown, info: DragInfo) {
        const wasRealDrag =
            Math.abs(info.offset.x) > 8 || Math.abs(info.velocity.x) > 120

        if (wasRealDrag) {
            ignoreClickUntilRef.current = Date.now() + 180
        }

        const nextIndex = clamp(
            getSwipeIndex(index, info, x.get(), carouselWidth),
            0,
            maxIndex
        )

        goTo(nextIndex)
    }

    function handleLightboxDragStart() {
        lightboxControls.current?.stop?.()
    }

    function handleLightboxDragEnd(_: unknown, info: DragInfo) {
        const nextIndex = clamp(
            getSwipeIndex(index, info, lightboxX.get(), lightboxWidth),
            0,
            maxIndex
        )

        goTo(nextIndex)
    }

    function openLightbox() {
        if (Date.now() < ignoreClickUntilRef.current) return

        setLightboxOpen(true)

        requestAnimationFrame(() => {
            lightboxX.set(-index * Math.max(1, lightboxWidth))
        })
    }

    const renderDots = (onDark = false) =>
        showDots &&
        imageCount > 1 && (
            <div
                aria-label="Product image navigation"
                style={{
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                }}
            >
                {items.map((_, dotIndex) => {
                    const active = dotIndex === index

                    return (
                        <button
                            key={dotIndex}
                            type="button"
                            aria-label={`Show image ${dotIndex + 1}`}
                            aria-current={active ? "true" : undefined}
                            onClick={(event) => {
                                event.stopPropagation()
                                goTo(dotIndex)
                            }}
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                border: "none",
                                padding: 0,
                                background: active
                                    ? activeDotColor
                                    : onDark
                                      ? "rgba(255,255,255,0.46)"
                                      : dotColor,
                                cursor: "pointer",
                                transform: active ? "scale(1.28)" : "scale(1)",
                                transition:
                                    "transform 0.16s ease, background 0.16s ease, opacity 0.16s ease",
                                opacity: active ? 1 : 0.62,
                            }}
                        />
                    )
                })}
            </div>
        )

    const renderTrack = ({
        value,
        width,
        isLightbox = false,
    }: {
        value: any
        width: number
        isLightbox?: boolean
    }) => {
        const slideWidth = Math.max(1, width)

        return (
            <motion.div
                drag={imageCount > 1 ? "x" : false}
                dragConstraints={{
                    left: -maxIndex * slideWidth,
                    right: 0,
                }}
                dragElastic={0.045}
                dragMomentum={false}
                onDragStart={
                    isLightbox
                        ? handleLightboxDragStart
                        : handleCarouselDragStart
                }
                onDragEnd={
                    isLightbox ? handleLightboxDragEnd : handleCarouselDragEnd
                }
                style={{
                    x: value,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    display: "flex",
                    cursor: imageCount > 1 ? "grab" : "default",
                    willChange: "transform",
                    transform: "translateZ(0)",
                }}
                whileTap={imageCount > 1 ? { cursor: "grabbing" } : {}}
            >
                {items.map((image, imageIndex) => (
                    <div
                        key={`${getImageSrc(image)}-${imageIndex}`}
                        style={{
                            position: "relative",
                            width: slideWidth,
                            height: "100%",
                            flex: "0 0 auto",
                            overflow: "hidden",
                        }}
                    >
                        <ProductImage
                            image={image}
                            radius={isLightbox ? 0 : radius}
                            onClick={isLightbox ? undefined : openLightbox}
                        />
                    </div>
                ))}
            </motion.div>
        )
    }

    return (
        <section
            style={{
                position: "relative",
                width: style?.width ?? "100%",
                height: style?.height ?? "auto",
                background,
                borderRadius: radius,
                overflow: "visible",
                boxSizing: "border-box",
                ...style,
            }}
            aria-roledescription="carousel"
            aria-label="Product image carousel"
        >
            <div
                ref={carouselRef}
                style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    overflow: "hidden",
                    borderRadius: radius,
                    background,
                    touchAction: "pan-y",
                    transform: "translateZ(0)",
                    contain: "layout paint",
                }}
            >
                {renderTrack({
                    value: x,
                    width: carouselWidth,
                    isLightbox: false,
                })}
            </div>

            {renderDots()}

            <AnimatePresence>
                {lightboxOpen && (
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Product image viewer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 99999,
                            background: lightboxBackground,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 18,
                            boxSizing: "border-box",
                        }}
                        onClick={() => setLightboxOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.99 }}
                            transition={{
                                type: "spring",
                                stiffness: 360,
                                damping: 38,
                                mass: 0.82,
                            }}
                            onClick={(event) => event.stopPropagation()}
                            style={{
                                width: "min(100%, 720px)",
                                aspectRatio: "1 / 1",
                                maxHeight: "calc(100dvh - 72px)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 14,
                            }}
                        >
                            <div
                                ref={lightboxFrameRef}
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    height: "100%",
                                    minHeight: 1,
                                    borderRadius: Math.min(radius, 18),
                                    overflow: "hidden",
                                    background,
                                    touchAction: "pan-y",
                                    transform: "translateZ(0)",
                                    contain: "layout paint",
                                }}
                            >
                                {renderTrack({
                                    value: lightboxX,
                                    width: lightboxWidth,
                                    isLightbox: true,
                                })}
                            </div>

                            {renderDots(true)}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}

addPropertyControls(MobileProductImageCarousel, {
    image1: {
        type: ControlType.ResponsiveImage,
        title: "Image 1",
    },
    image2: {
        type: ControlType.ResponsiveImage,
        title: "Image 2",
    },
    image3: {
        type: ControlType.ResponsiveImage,
        title: "Image 3",
    },
    image4: {
        type: ControlType.ResponsiveImage,
        title: "Image 4",
    },
    image5: {
        type: ControlType.ResponsiveImage,
        title: "Image 5",
    },
    image6: {
        type: ControlType.ResponsiveImage,
        title: "Image 6",
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#F6F7F9",
    },
    lightboxBackground: {
        type: ControlType.Color,
        title: "Lightbox BG",
        defaultValue: "rgba(8, 10, 14, 0.94)",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 18,
        min: 0,
        max: 40,
        step: 1,
        unit: "px",
    },
    showDots: {
        type: ControlType.Boolean,
        title: "Dots",
        defaultValue: true,
    },
    dotColor: {
        type: ControlType.Color,
        title: "Dot",
        defaultValue: "#B8BDC7",
    },
    activeDotColor: {
        type: ControlType.Color,
        title: "Active Dot",
        defaultValue: "#111827",
    },
    dragThreshold: {
        type: ControlType.Number,
        title: "Swipe Snap",
        defaultValue: 42,
        min: 12,
        max: 140,
        step: 1,
        unit: "px",
    },
})
