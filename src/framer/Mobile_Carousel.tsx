import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { flushSync } from "react-dom"
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

function wrapIndex(index: number, length: number) {
    return ((index % length) + length) % length
}

function getImageSrc(image?: ResponsiveImage) {
    return image?.src || ""
}

function useElementWidth<T extends HTMLElement>() {
    const ref = React.useRef<T>(null)
    const [width, setWidth] = React.useState(1)

    React.useEffect(() => {
        const element = ref.current
        if (!element) return

        const update = () => {
            setWidth(Math.max(1, element.getBoundingClientRect().width))
        }

        update()

        if (typeof ResizeObserver === "undefined") {
            if (typeof window === "undefined") return
            window.addEventListener("resize", update)
            return () => window.removeEventListener("resize", update)
        }

        const observer = new ResizeObserver(update)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])

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
            style={{
                width: "100%",
                height: "100%",
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: onClick ? "zoom-in" : "default",
                display: "block",
                WebkitTapHighlightColor: "transparent",
            }}
            aria-label="Open product image"
        >
            {src ? (
                <img
                    src={src}
                    srcSet={image.srcSet}
                    alt={image.alt || "Product image"}
                    draggable={false}
                    decoding="async"
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                        objectFit: "cover",
                        objectPosition: "center",
                        borderRadius: radius,
                        userSelect: "none",
                        pointerEvents: "none",
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
    const prefersReducedMotion = useReducedMotion()
    const [index, setIndex] = React.useState(0)
    const [lightboxOpen, setLightboxOpen] = React.useState(false)
    const [carouselRef, carouselWidth] = useElementWidth<HTMLDivElement>()
    const [lightboxFrameRef, lightboxWidth] = useElementWidth<HTMLDivElement>()
    const isCarouselAnimating = React.useRef(false)
    const isLightboxAnimating = React.useRef(false)
    const carouselControls = React.useRef<any>(null)
    const lightboxControls = React.useRef<any>(null)
    const x = useMotionValue(0)
    const lightboxX = useMotionValue(0)

    React.useEffect(() => {
        setIndex((current) => wrapIndex(current, imageCount))
    }, [imageCount])

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
            if (event.key === "ArrowLeft") slideLightboxBy(-1)
            if (event.key === "ArrowRight") slideLightboxBy(1)
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [lightboxOpen, index, imageCount])

    function commitIndex(nextIndex: number, value: any) {
        value.set(0)
        flushSync(() => setIndex(nextIndex))
    }

    function animateToZero(
        value: any,
        controlsRef: React.MutableRefObject<any>
    ) {
        controlsRef.current?.stop?.()

        if (prefersReducedMotion) {
            value.set(0)
            return
        }

        controlsRef.current = animate(value, 0, {
            type: "spring",
            stiffness: 360,
            damping: 36,
            mass: 0.78,
        })
    }

    function slideBy(
        delta: number,
        value: any,
        width: number,
        lockRef: React.MutableRefObject<boolean>,
        controlsRef: React.MutableRefObject<any>
    ) {
        if (imageCount <= 1 || lockRef.current) return

        const nextIndex = wrapIndex(index + delta, imageCount)
        const target = delta > 0 ? -width : width

        controlsRef.current?.stop?.()
        lockRef.current = true

        if (prefersReducedMotion) {
            commitIndex(nextIndex, value)
            lockRef.current = false
            return
        }

        const controls = animate(value, target, {
            type: "spring",
            stiffness: 300,
            damping: 34,
            mass: 0.86,
            restDelta: 0.5,
            restSpeed: 12,
        })

        controlsRef.current = controls
        controls.then(() => {
            if (controlsRef.current !== controls) return
            commitIndex(nextIndex, value)
            controlsRef.current = null
            lockRef.current = false
        })
    }

    function slideCarouselBy(delta: number) {
        slideBy(delta, x, carouselWidth, isCarouselAnimating, carouselControls)
    }

    function slideLightboxBy(delta: number) {
        slideBy(
            delta,
            lightboxX,
            lightboxWidth,
            isLightboxAnimating,
            lightboxControls
        )
    }

    function handleDragEnd(_: unknown, info: DragInfo) {
        if (imageCount <= 1) {
            animateToZero(x, carouselControls)
            return
        }

        const threshold = Math.max(24, dragThreshold)
        if (info.offset.x <= -threshold || info.velocity.x <= -480) {
            slideCarouselBy(1)
        } else if (info.offset.x >= threshold || info.velocity.x >= 480) {
            slideCarouselBy(-1)
        } else {
            animateToZero(x, carouselControls)
        }
    }

    function handleLightboxDragEnd(_: unknown, info: DragInfo) {
        if (imageCount <= 1) {
            animateToZero(lightboxX, lightboxControls)
            return
        }

        const threshold = Math.max(24, dragThreshold)
        if (info.offset.x <= -threshold || info.velocity.x <= -480) {
            slideLightboxBy(1)
        } else if (info.offset.x >= threshold || info.velocity.x >= 480) {
            slideLightboxBy(-1)
        } else {
            animateToZero(lightboxX, lightboxControls)
        }
    }

    function jumpTo(dotIndex: number) {
        carouselControls.current?.stop?.()
        lightboxControls.current?.stop?.()
        carouselControls.current = null
        lightboxControls.current = null
        x.set(0)
        lightboxX.set(0)
        isCarouselAnimating.current = false
        isLightboxAnimating.current = false
        setIndex(dotIndex)
    }

    const activeImage = items[index]
    const previousImage = items[wrapIndex(index - 1, imageCount)]
    const nextImage = items[wrapIndex(index + 1, imageCount)]

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
                            onClick={(event) => {
                                event.stopPropagation()
                                jumpTo(dotIndex)
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
                                    "transform 0.18s ease, background 0.18s ease, opacity 0.18s ease",
                                opacity: active ? 1 : 0.62,
                            }}
                        />
                    )
                })}
            </div>
        )

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
                }}
            >
                <motion.div
                    drag={imageCount > 1 ? "x" : false}
                    dragConstraints={{
                        left: -carouselWidth,
                        right: carouselWidth,
                    }}
                    dragElastic={0.08}
                    dragMomentum={false}
                    onDragEnd={handleDragEnd}
                    style={{
                        x,
                        position: "absolute",
                        inset: 0,
                        cursor: imageCount > 1 ? "grab" : "default",
                    }}
                    whileTap={imageCount > 1 ? { cursor: "grabbing" } : {}}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            transform: "translateX(-100%)",
                        }}
                    >
                        <ProductImage
                            image={previousImage}
                            radius={radius}
                            onClick={() => setLightboxOpen(true)}
                        />
                    </div>
                    <div style={{ position: "absolute", inset: 0 }}>
                        <ProductImage
                            image={activeImage}
                            radius={radius}
                            onClick={() => setLightboxOpen(true)}
                        />
                    </div>
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            transform: "translateX(100%)",
                        }}
                    >
                        <ProductImage
                            image={nextImage}
                            radius={radius}
                            onClick={() => setLightboxOpen(true)}
                        />
                    </div>
                </motion.div>
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
                        transition={{ duration: 0.22, ease: "easeOut" }}
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
                            initial={{
                                opacity: 0,
                                scale: 0.99,
                            }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{
                                opacity: 0,
                                scale: 0.99,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 360,
                                damping: 38,
                                mass: 0.82,
                            }}
                            onClick={(event) => event.stopPropagation()}
                            style={{
                                width: "min(100%, 720px)",
                                maxHeight: "calc(100dvh - 56px)",
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
                                    aspectRatio: "1 / 1",
                                    maxHeight: "calc(100dvh - 98px)",
                                    borderRadius: Math.min(radius, 18),
                                    overflow: "hidden",
                                    background,
                                    touchAction: "pan-y",
                                }}
                            >
                                <motion.div
                                    drag={imageCount > 1 ? "x" : false}
                                    dragConstraints={{
                                        left: -lightboxWidth,
                                        right: lightboxWidth,
                                    }}
                                    dragElastic={0.06}
                                    dragMomentum={false}
                                    onDragEnd={handleLightboxDragEnd}
                                    style={{
                                        x: lightboxX,
                                        position: "absolute",
                                        inset: 0,
                                        cursor:
                                            imageCount > 1 ? "grab" : "default",
                                    }}
                                    whileTap={
                                        imageCount > 1
                                            ? { cursor: "grabbing" }
                                            : {}
                                    }
                                >
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            transform: "translateX(-100%)",
                                        }}
                                    >
                                        <ProductImage
                                            image={previousImage}
                                            radius={0}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                        }}
                                    >
                                        <ProductImage
                                            image={activeImage}
                                            radius={0}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            transform: "translateX(100%)",
                                        }}
                                    >
                                        <ProductImage
                                            image={nextImage}
                                            radius={0}
                                        />
                                    </div>
                                </motion.div>
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
        defaultValue: 56,
        min: 20,
        max: 160,
        step: 1,
        unit: "px",
    },
})
