import { forwardRef, type ComponentType, type KeyboardEvent } from "react"
// @ts-expect-error Framer resolves this URL module at runtime inside code overrides.
import { createStore } from "https://framer.com/m/framer/store.js@^1.0.0"

// Learn more: https://www.framer.com/developers/overrides/

type VariantName = "Beige" | "Red" | "Blue"
type OverrideProps = {
    onClick?: (event: unknown) => void
    onTap?: (event: unknown) => void
    onKeyDown?: (event: KeyboardEvent) => void
    role?: string
    tabIndex?: number
    [key: string]: unknown
}

const useStore = createStore({
    variant: "beige",
})

function withVariantSwitch(
    Component: ComponentType<OverrideProps>,
    variantName: VariantName
): ComponentType<OverrideProps> {
    return forwardRef((props: OverrideProps, ref) => {
        const [store, setStore] = useStore()
        const selected = store.variant === variantName
        const handleChange = (event: unknown) => {
            props.onClick?.(event)
            props.onTap?.(event)
            setStore({ variant: variantName })
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            props.onKeyDown?.(event)
            if (event.key !== "Enter" && event.key !== " ") return
            event.preventDefault()
            handleChange(event)
        }
        return (
            <Component
                ref={ref}
                {...props}
                onClick={handleChange}
                onTap={handleChange}
                onKeyDown={handleKeyDown}
                role={props.role ?? "button"}
                tabIndex={props.tabIndex ?? 0}
                aria-pressed={selected}
                aria-label={props["aria-label"] ?? `Select ${variantName} colorway`}
            />
        )
    })
}

export function withVariant(
    Component: ComponentType<OverrideProps>
): ComponentType<OverrideProps> {
    return forwardRef((props: OverrideProps, ref) => {
        const [store] = useStore()

        return <Component ref={ref} {...props} variant={store.variant} />
    })
}

export const withBeige = (Component: ComponentType<OverrideProps>): ComponentType<OverrideProps> =>
    withVariantSwitch(Component, "Beige")

export const withOrange = (Component: ComponentType<OverrideProps>): ComponentType<OverrideProps> =>
    withVariantSwitch(Component, "Red")

export const withSkyBlue = (Component: ComponentType<OverrideProps>): ComponentType<OverrideProps> =>
    withVariantSwitch(Component, "Blue")
