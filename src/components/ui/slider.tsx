
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  // Determine the number of thumbs needed based on the value or defaultValue prop
  // Radix's SliderPrimitive.Root expects a Thumb component for each value in the array.
  const value = props.value ?? props.defaultValue;
  const thumbsToRender = Array.isArray(value) ? value : (value !== undefined ? [value] : [0]); // Default to one thumb if no value/defaultValue

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props} // Pass all props, including value, to the Root
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {/* Render a Thumb for each value in the thumbsToRender array */}
      {thumbsToRender.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index} // React key for mapped elements
          className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          aria-label={thumbsToRender.length > 1 ? `Value ${index + 1}` : 'Value'} // Accessibility improvement
        />
      ))}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
