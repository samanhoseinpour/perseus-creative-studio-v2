"use client"

import * as React from "react"
import { LuChevronDown as ChevronDownIcon } from "react-icons/lu"
import { Accordion as AccordionPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  // Radix renders the Header as an <h3> by default; an <h2> can never break
  // heading order (the FAQ page goes straight from its H1 to the accordion).
  // Tailwind preflight keeps the rendering identical.
  return (
    <AccordionPrimitive.Header asChild>
      <h2 className="flex">
        <AccordionPrimitive.Trigger
          data-slot="accordion-trigger"
          className={cn(
            "focus-visible:border-ring flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
            className
          )}
          {...props}
        >
          {children}
          <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
        </AccordionPrimitive.Trigger>
      </h2>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  // forceMount keeps every answer in the server-rendered HTML (crawlers that
  // don't run JS — most AI crawlers — only ever see that payload). With
  // forceMount Radix no longer applies `hidden` when closed and its
  // --radix-accordion-content-height keyframes can't run, so open/close is a
  // grid-template-rows transition instead, with `visibility` handling the
  // accessibility tree and tab order (answers contain links).
  return (
    <AccordionPrimitive.Content
      forceMount
      data-slot="accordion-content"
      className="grid text-sm transition-[grid-template-rows,visibility] duration-200 ease-out data-[state=open]:grid-rows-[1fr] data-[state=closed]:grid-rows-[0fr] data-[state=closed]:invisible motion-reduce:transition-none"
      {...props}
    >
      {/* The clipping row must carry no padding — border-box height can't
          shrink below padding, so 16px would leak when closed. Consumer
          className keeps landing on the innermost div, as before. */}
      <div className="min-h-0 overflow-hidden">
        <div className={cn("pt-0 pb-4", className)}>{children}</div>
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
