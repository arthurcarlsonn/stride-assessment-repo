// Product Image Zoom on Hover - Interactive image component with smooth zoom effects
// Image component with zoom functionality that shows a magnified popover on hover
import {
    useState,
    useRef,
    useCallback,
    useEffect,
    type CSSProperties,
} from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

interface ImageZoom {
    image: { src: string; alt?: string }
    type: "cover" | "contain" | "fill" | "none"
    zoomLevel: number
    size: number
    radius: number
    border: {
        color: string
        width: number
    }
    disabled: boolean

    style?: CSSProperties
}

/**
 * Image Zoom Pop-out Component
 *
 * Interactive image component that shows a magnified popover on hover.
 * Upload an image or provide a URL to get started.
 *
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function ImageZoom(props: ImageZoom) {
    const {
        image = {
            src: "https://framerusercontent.com/images/i6ynWPDWxplht3ITKrhDjo0E7Qo.jpg",
            alt: "Product image",
        },
        type = "cover",
        zoomLevel = 2,
        size = 200,
        radius = 8,
        border,
        disabled,
    } = props

    const [isHovered, setIsHovered] = useState(false)
    const [containerDimensions, setContainerDimensions] = useState({
        width: 400,
        height: 400,
    })
    const [imageDimensions, setImageDimensions] = useState({
        width: 400,
        height: 400,
        offsetX: 0,
        offsetY: 0,
    })
    const [popOutPos, setPopOutPos] = useState({ x: 0, y: 0 })
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const containerRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)

    // Motion values for cursor tracking
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Update container dimensions
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setContainerDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                })
            }
        }

        updateDimensions()

        if (typeof window !== "undefined") {
            window.addEventListener("resize", updateDimensions)
            return () => window.removeEventListener("resize", updateDimensions)
        }
    }, [])

    // Calculate actual rendered image dimensions based on object-fit
    useEffect(() => {
        if (!imageRef.current || !containerRef.current) return

        const img = new Image()
        img.src = image.src
        img.onload = () => {
            const containerWidth = containerRef.current!.offsetWidth
            const containerHeight = containerRef.current!.offsetHeight
            const imageAspect = img.naturalWidth / img.naturalHeight
            const containerAspect = containerWidth / containerHeight

            let renderedWidth = containerWidth
            let renderedHeight = containerHeight
            let offsetX = 0
            let offsetY = 0

            if (type === "cover") {
                if (imageAspect > containerAspect) {
                    renderedWidth = containerHeight * imageAspect
                    offsetX = (containerWidth - renderedWidth) / 2
                } else {
                    renderedHeight = containerWidth / imageAspect
                    offsetY = (containerHeight - renderedHeight) / 2
                }
            } else if (type === "contain") {
                if (imageAspect > containerAspect) {
                    renderedHeight = containerWidth / imageAspect
                    offsetY = (containerHeight - renderedHeight) / 2
                } else {
                    renderedWidth = containerHeight * imageAspect
                    offsetX = (containerWidth - renderedWidth) / 2
                }
            } else if (type === "fill") {
                renderedWidth = containerWidth
                renderedHeight = containerHeight
            } else if (type === "none") {
                renderedWidth = img.naturalWidth
                renderedHeight = img.naturalHeight
                offsetX = (containerWidth - renderedWidth) / 2
                offsetY = (containerHeight - renderedHeight) / 2
            }

            setImageDimensions({
                width: renderedWidth,
                height: renderedHeight,
                offsetX,
                offsetY,
            })
        }
    }, [image.src, containerDimensions, type])

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            // Store actual mouse position for background calculation
            setMousePos({ x, y })

            // Calculate pop-out position centered on cursor
            const popX = x - size / 2
            const popY = y - size / 2

            setPopOutPos({ x: popX, y: popY })
        },
        [size]
    )

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true)
    }, [])

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false)
    }, [])

    const handleFocus = useCallback(() => {
        const x = containerDimensions.width / 2
        const y = containerDimensions.height / 2
        setMousePos({ x, y })
        setPopOutPos({ x: x - size / 2, y: y - size / 2 })
        setIsHovered(true)
    }, [containerDimensions.height, containerDimensions.width, size])

    // Calculate background position to center zoom on cursor
    // The zoomed image should show exactly what's under the cursor in the center of the pop-out
    const centerX = size / 2
    const centerY = size / 2

    // Position relative to the actual rendered image
    const imageRelativeX = mousePos.x - imageDimensions.offsetX
    const imageRelativeY = mousePos.y - imageDimensions.offsetY

    // Calculate background position: center of pop-out minus zoomed cursor position
    const bgX = centerX - imageRelativeX * zoomLevel
    const bgY = centerY - imageRelativeY * zoomLevel

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                cursor: "default",
                overflow: "visible",
            }}
            onMouseMove={!disabled ? handleMouseMove : undefined}
            onMouseEnter={!disabled ? handleMouseEnter : undefined}
            onMouseLeave={!disabled ? handleMouseLeave : undefined}
            onFocus={!disabled ? handleFocus : undefined}
            onBlur={!disabled ? handleMouseLeave : undefined}
            tabIndex={!disabled ? 0 : undefined}
            role="group"
            aria-label={`${image.alt || "Product image"} zoom preview`}
        >
            {/* Main image */}
            <img
                ref={imageRef}
                src={image.src}
                alt={image.alt || "Zoomable image"}
                draggable={false}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: type,
                    display: "block",
                    userSelect: "none",
                }}
            />

            {/* Zoom pop-out window */}
            {isHovered && !disabled && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        width: size,
                        height: size,
                        left: popOutPos.x,
                        top: popOutPos.y,
                        borderRadius: `${radius}px`,
                        overflow: "hidden",
                        pointerEvents: "none",
                        zIndex: 1000,
                        border: `${border.width}px solid ${border.color}`,
                    }}
                >
                    {/* Zoomed image inside pop-out */}
                    <div
                        style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
                            backgroundImage: `url(${image.src})`,
                            backgroundSize: `${imageDimensions.width * zoomLevel}px ${imageDimensions.height * zoomLevel}px`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: `${bgX}px ${bgY}px`,
                        }}
                    />
                </motion.div>
            )}
        </div>
    )
}

addPropertyControls(ImageZoom, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    type: {
        type: ControlType.Enum,
        title: "Image Fit",
        options: ["cover", "contain", "fill", "none"],
        optionTitles: ["Cover", "Contain", "Fill", "None"],
        defaultValue: "cover",
        displaySegmentedControl: false,
    },

    zoomLevel: {
        type: ControlType.Number,
        title: "Zoom Level",
        defaultValue: 2,
        min: 1.5,
        max: 4,
        step: 0.1,
    },
    size: {
        type: ControlType.Number,
        title: "Size",
        defaultValue: 200,
        min: 100,
        max: 400,
        step: 10,
        unit: "px",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 8,
        min: 0,
        step: 1,
        unit: "px",
    },
    border: {
        type: ControlType.Object,
        controls: {
            color: {
                type: ControlType.Color,
                title: "Color",
                defaultValue: "#FFF",
            },
            width: {
                type: ControlType.Number,
                title: "Width",
                defaultValue: 2,
                min: 0,
                max: 10,
                step: 1,
                unit: "px",
            },
        },
    },
    disabled: {
        type: ControlType.Boolean,
        defaultValue: false,
    },
})
