import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

type Props = {
    assembledImage: string | { src?: string }
    layerOneImage: string | { src?: string }
    layerTwoImage: string | { src?: string }
    layerThreeImage: string | { src?: string }
    layerFourImage: string | { src?: string }
    imageAlt: string
    cardOne?: React.ReactNode
    cardTwo?: React.ReactNode
    cardThree?: React.ReactNode
    cardFour?: React.ReactNode
    backgroundColor: string
    scrollLength: number
    maxWidth: number
    imageWidth: number
    tabletImageWidth: number
    mobileImageWidth: number
    imageAspectRatio: number
    desktopExplodedX: number
    tabletExplodedX: number
    layerGap: number
    transitionBlur: number
    cardWidth: number
    cardGap: number
    topPadding: number
    bottomPadding: number
    style?: React.CSSProperties
}

const clamp = (value: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value))

const lerp = (from: number, to: number, amount: number) =>
    from + (to - from) * amount

const smooth = (value: number) => {
    const t = clamp(value)
    return t * t * (3 - 2 * t)
}

const range = (progress: number, start: number, end: number) =>
    clamp((progress - start) / (end - start))

const getImageSource = (image: string | { src?: string } | undefined) => {
    if (!image) return ""
    return typeof image === "string" ? image : image.src || ""
}

function useReducedMotionPreference() {
    const [reducedMotion, setReducedMotion] = React.useState(false)

    React.useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return

        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
        const update = () => setReducedMotion(mediaQuery.matches)

        update()
        mediaQuery.addEventListener?.("change", update)

        return () => mediaQuery.removeEventListener?.("change", update)
    }, [])

    return reducedMotion
}

function useViewportMode() {
    const [mode, setMode] = React.useState<"desktop" | "tablet" | "mobile">(
        "desktop"
    )

    React.useEffect(() => {
        const update = () => {
            const width = window.innerWidth
            setMode(
                width < 700 ? "mobile" : width < 1100 ? "tablet" : "desktop"
            )
        }

        update()
        window.addEventListener("resize", update)
        return () => window.removeEventListener("resize", update)
    }, [])

    return mode
}

function getProgress(section: HTMLDivElement) {
    const rect = section.getBoundingClientRect()
    const pageTop = window.scrollY + rect.top
    const scrollableDistance = section.offsetHeight - window.innerHeight

    if (scrollableDistance <= 0) return rect.top <= 0 ? 1 : 0

    return clamp((window.scrollY - pageTop) / scrollableDistance)
}

export default function StrideLayerScrollSection(props: Props) {
    const {
        assembledImage,
        layerOneImage,
        layerTwoImage,
        layerThreeImage,
        layerFourImage,
        imageAlt,
        cardOne,
        cardTwo,
        cardThree,
        cardFour,
        backgroundColor,
        scrollLength,
        maxWidth,
        imageWidth,
        tabletImageWidth,
        mobileImageWidth,
        imageAspectRatio,
        desktopExplodedX,
        tabletExplodedX,
        layerGap,
        transitionBlur,
        cardWidth,
        cardGap,
        topPadding,
        bottomPadding,
        style,
    } = props

    const reducedMotion = useReducedMotionPreference()
    const mode = useViewportMode()
    const isMobile = mode === "mobile"

    const sectionRef = React.useRef<HTMLDivElement>(null)
    const visualRef = React.useRef<HTMLDivElement>(null)
    const assembledRef = React.useRef<HTMLImageElement>(null)
    const layerRefs = React.useRef<Array<HTMLImageElement | null>>([])
    const cardRefs = React.useRef<Array<HTMLDivElement | null>>([])

    const assembledSrc = getImageSource(assembledImage)
    const layerSources = [
        getImageSource(layerOneImage),
        getImageSource(layerTwoImage),
        getImageSource(layerThreeImage),
        getImageSource(layerFourImage),
    ]
    const cardSlots = [cardOne, cardTwo, cardThree, cardFour]

    const imageSize =
        mode === "mobile"
            ? mobileImageWidth
            : mode === "tablet"
              ? tabletImageWidth
              : imageWidth

    const visualTop = isMobile ? "36%" : "50%"
    const stickyPadding = isMobile ? 22 : 40
    const verticalTopPadding = isMobile ? Math.min(topPadding, 28) : topPadding
    const verticalBottomPadding = isMobile
        ? Math.min(bottomPadding, 28)
        : bottomPadding

    React.useEffect(() => {
        const section = sectionRef.current
        if (!section) return

        const layerYMultipliers = [-1.25, -0.2, 0.9, 1.95]
        const layerZIndexes = [4, 3, 2, 1]
        const effectiveLayerGap = isMobile ? layerGap * 0.64 : layerGap
        const explodedX = isMobile
            ? 0
            : mode === "tablet"
              ? tabletExplodedX
              : desktopExplodedX

        let frame = 0

        const apply = () => {
            const progress = reducedMotion ? 1 : getProgress(section)
            const introOut = reducedMotion
                ? 1
                : smooth(range(progress, 0.08, 0.25))
            const partsIn = reducedMotion
                ? 1
                : smooth(range(progress, 0.14, 0.32))
            const explode = reducedMotion
                ? 1
                : smooth(range(progress, 0.25, 0.48))
            const layerOrganization = Math.max(partsIn, explode)
            const slide = reducedMotion
                ? 1
                : smooth(range(progress, 0.42, 0.66))
            const cardsIn = reducedMotion
                ? 1
                : smooth(range(progress, 0.56, 0.74))
            const highlightPhase = reducedMotion
                ? 0
                : smooth(range(progress, 0.62, 0.95))
            const layerFocusPosition = reducedMotion
                ? 0
                : range(progress, 0.6, 0.98) * 3
            const activeIndex =
                reducedMotion || progress < 0.6
                    ? -1
                    : Math.min(3, Math.floor(range(progress, 0.6, 0.98) * 4))
            const mobileActiveIndex = activeIndex >= 0 ? activeIndex : 0
            const visualY = isMobile ? lerp(-26, -72, slide) : 0
            const visualScale = isMobile ? lerp(1, 0.7, slide) : 1

            if (visualRef.current) {
                visualRef.current.style.transform = `translate(-50%, -50%) translate(${lerp(
                    0,
                    explodedX,
                    slide
                )}px, ${visualY}px) scale(${visualScale})`
            }

            if (assembledRef.current) {
                assembledRef.current.style.opacity = String(1 - introOut)
                assembledRef.current.style.filter =
                    transitionBlur > 0 && introOut < 1
                        ? `blur(${transitionBlur * introOut}px)`
                        : "none"
            }

            layerRefs.current.forEach((layer, index) => {
                if (!layer) return

                const focusDistance = Math.abs(index - layerFocusPosition)
                const activeWeight =
                    activeIndex < 0 ? 1 : 1 - smooth(clamp(focusDistance, 0, 1))
                const dimmedOpacity =
                    activeIndex < 0 ? 1 : lerp(0.24, 1, activeWeight)
                const layerGrey = lerp(
                    0,
                    activeIndex < 0 ? 0 : 1 - activeWeight,
                    highlightPhase
                )
                const layerOpacity = partsIn * dimmedOpacity
                const y =
                    layerYMultipliers[index] *
                    effectiveLayerGap *
                    layerOrganization
                const blur = transitionBlur * (1 - partsIn)
                const layerScale =
                    index === 0 ? 1 : lerp(0.88, 1, layerOrganization)
                const filterParts = [
                    blur > 0.25 ? `blur(${blur}px)` : "",
                    `grayscale(${layerGrey * 0.82})`,
                    `saturate(${lerp(1, 0.34, layerGrey)})`,
                    `brightness(${lerp(1, 0.86, layerGrey)})`,
                ].filter(Boolean)

                layer.style.opacity = String(layerOpacity)
                layer.style.transform = `translate3d(0, ${y}px, 0) scale(${layerScale})`
                layer.style.zIndex = String(layerZIndexes[index])
                layer.style.filter = filterParts.join(" ")
            })

            cardRefs.current.forEach((card, index) => {
                if (!card) return

                const cardProgress = smooth(
                    range(progress, 0.56 + index * 0.075, 0.72 + index * 0.075)
                )
                const isActive = index === activeIndex
                const isMobileActive = index === mobileActiveIndex
                const selectedOpacity = isMobile
                    ? isMobileActive
                        ? 1
                        : 0
                    : activeIndex < 0
                      ? 1
                      : isActive
                        ? 1
                        : 0.38
                const cardOpacity = isMobile
                    ? selectedOpacity * cardProgress
                    : cardProgress * lerp(1, selectedOpacity, highlightPhase)
                const renderedOpacity =
                    reducedMotion && !isMobile ? 1 : cardOpacity
                const cardScale =
                    isActive || (isMobile && isMobileActive)
                        ? 1
                        : isMobile
                          ? 0.96
                          : 0.985
                const cardY = isMobile
                    ? lerp(18, 0, cardProgress)
                    : lerp(28, 0, cardProgress)

                card.style.opacity = String(renderedOpacity)
                card.style.transform = `translateY(${cardY}px) scale(${cardScale})`
                card.style.pointerEvents =
                    renderedOpacity > 0.75 && cardsIn > 0.75 ? "auto" : "none"
                card.style.zIndex = String(
                    isActive || (isMobile && isMobileActive) ? 2 : 1
                )
            })
        }

        const requestApply = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(apply)
        }

        apply()
        window.addEventListener("scroll", requestApply, { passive: true })
        window.addEventListener("resize", requestApply)

        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener("scroll", requestApply)
            window.removeEventListener("resize", requestApply)
        }
    }, [
        reducedMotion,
        mode,
        isMobile,
        desktopExplodedX,
        tabletExplodedX,
        layerGap,
        transitionBlur,
    ])

    return (
        <section
            ref={sectionRef}
            style={{
                ...style,
                position: "relative",
                height: reducedMotion ? "auto" : `${scrollLength}vh`,
                minHeight: reducedMotion ? "100vh" : undefined,
                background: backgroundColor,
                overflow: "visible",
            }}
        >
            <div
                style={{
                    position: reducedMotion ? "relative" : "sticky",
                    top: 0,
                    minHeight: isMobile ? "100dvh" : "100vh",
                    overflow: "hidden",
                    padding: `${verticalTopPadding}px ${stickyPadding}px ${verticalBottomPadding}px`,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        width: "100%",
                        maxWidth,
                        minHeight: isMobile ? "calc(100dvh - 56px)" : 660,
                    }}
                >
                    <div
                        ref={visualRef}
                        aria-label={imageAlt}
                        role="img"
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: visualTop,
                            width: imageSize,
                            aspectRatio: `${imageAspectRatio} / 1`,
                            transform: "translate(-50%, -50%)",
                            transformOrigin: "center",
                            willChange: "transform",
                        }}
                    >
                        {assembledSrc && (
                            <img
                                ref={assembledRef}
                                src={assembledSrc}
                                alt=""
                                draggable={false}
                                decoding="async"
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                    objectPosition: "center center",
                                    opacity: 1,
                                    userSelect: "none",
                                    pointerEvents: "none",
                                    willChange: "opacity, filter",
                                }}
                            />
                        )}

                        {layerSources.map((src, index) => {
                            if (!src) return null

                            return (
                                <img
                                    key={index}
                                    ref={(element) => {
                                        layerRefs.current[index] = element
                                    }}
                                    src={src}
                                    alt=""
                                    draggable={false}
                                    decoding="async"
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "contain",
                                        objectPosition: "center center",
                                        opacity: 0,
                                        transform: "translate3d(0, 0, 0)",
                                        userSelect: "none",
                                        pointerEvents: "none",
                                        willChange:
                                            "transform, opacity, filter",
                                    }}
                                />
                            )
                        })}
                    </div>

                    <div
                        style={{
                            position: "absolute",
                            right: isMobile ? "50%" : 0,
                            top: isMobile ? "auto" : "50%",
                            bottom: isMobile ? 20 : "auto",
                            width: isMobile ? "min(100%, 420px)" : cardWidth,
                            minHeight: isMobile ? 176 : undefined,
                            transform: isMobile
                                ? "translateX(50%)"
                                : "translateY(-50%)",
                            display: isMobile ? "block" : "grid",
                            gap: cardGap,
                        }}
                    >
                        {cardSlots.map((card, index) => {
                            if (!card) return null

                            return (
                                <div
                                    key={index}
                                    ref={(element) => {
                                        cardRefs.current[index] = element
                                    }}
                                    style={{
                                        width: "100%",
                                        position: isMobile
                                            ? "absolute"
                                            : "relative",
                                        inset: isMobile ? 0 : undefined,
                                        opacity: 0,
                                        transform:
                                            "translateY(28px) scale(.985)",
                                        pointerEvents: "none",
                                        willChange: "transform, opacity",
                                    }}
                                >
                                    {card}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}

StrideLayerScrollSection.defaultProps = {
    imageAlt: "Exploded Stride sneaker layer system",
    backgroundColor: "rgba(255,255,255,0)",
    scrollLength: 340,
    maxWidth: 1180,
    imageWidth: 660,
    tabletImageWidth: 560,
    mobileImageWidth: 360,
    imageAspectRatio: 1.62,
    desktopExplodedX: -310,
    tabletExplodedX: -220,
    layerGap: 124,
    transitionBlur: 10,
    cardWidth: 390,
    cardGap: 12,
    topPadding: 56,
    bottomPadding: 56,
}

addPropertyControls(StrideLayerScrollSection, {
    assembledImage: {
        type: ControlType.Image,
        title: "Full Shoe",
    },
    layerOneImage: {
        type: ControlType.Image,
        title: "Layer 1",
    },
    layerTwoImage: {
        type: ControlType.Image,
        title: "Layer 2",
    },
    layerThreeImage: {
        type: ControlType.Image,
        title: "Layer 3",
    },
    layerFourImage: {
        type: ControlType.Image,
        title: "Layer 4",
    },
    cardOne: {
        type: ControlType.ComponentInstance,
        title: "Card 1",
    },
    cardTwo: {
        type: ControlType.ComponentInstance,
        title: "Card 2",
    },
    cardThree: {
        type: ControlType.ComponentInstance,
        title: "Card 3",
    },
    cardFour: {
        type: ControlType.ComponentInstance,
        title: "Card 4",
    },
    imageAlt: {
        type: ControlType.String,
        title: "Alt",
        defaultValue: "Exploded Stride sneaker layer system",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "rgba(255,255,255,0)",
    },
    scrollLength: {
        type: ControlType.Number,
        title: "Scroll VH",
        min: 180,
        max: 620,
        step: 10,
        defaultValue: 340,
    },
    maxWidth: {
        type: ControlType.Number,
        title: "Max Width",
        min: 900,
        max: 1600,
        step: 10,
        defaultValue: 1180,
    },
    imageWidth: {
        type: ControlType.Number,
        title: "Image",
        min: 420,
        max: 980,
        step: 10,
        defaultValue: 660,
    },
    tabletImageWidth: {
        type: ControlType.Number,
        title: "Tablet Img",
        min: 340,
        max: 760,
        step: 10,
        defaultValue: 560,
    },
    mobileImageWidth: {
        type: ControlType.Number,
        title: "Mobile Img",
        min: 260,
        max: 520,
        step: 10,
        defaultValue: 360,
    },
    imageAspectRatio: {
        type: ControlType.Number,
        title: "Img Ratio",
        min: 0.8,
        max: 2.4,
        step: 0.01,
        defaultValue: 1.62,
    },
    desktopExplodedX: {
        type: ControlType.Number,
        title: "Desktop X",
        min: -520,
        max: 0,
        step: 10,
        defaultValue: -310,
    },
    tabletExplodedX: {
        type: ControlType.Number,
        title: "Tablet X",
        min: -360,
        max: 0,
        step: 10,
        defaultValue: -220,
    },
    layerGap: {
        type: ControlType.Number,
        title: "Layer Gap",
        min: 40,
        max: 220,
        step: 2,
        defaultValue: 124,
    },
    transitionBlur: {
        type: ControlType.Number,
        title: "Fade Blur",
        min: 0,
        max: 24,
        step: 1,
        defaultValue: 10,
    },
    cardWidth: {
        type: ControlType.Number,
        title: "Card Width",
        min: 280,
        max: 520,
        step: 10,
        defaultValue: 390,
    },
    cardGap: {
        type: ControlType.Number,
        title: "Card Gap",
        min: 0,
        max: 48,
        step: 1,
        defaultValue: 12,
    },
    topPadding: {
        type: ControlType.Number,
        title: "Top Pad",
        min: 0,
        max: 160,
        step: 4,
        defaultValue: 56,
    },
    bottomPadding: {
        type: ControlType.Number,
        title: "Bottom Pad",
        min: 0,
        max: 160,
        step: 4,
        defaultValue: 56,
    },
})
