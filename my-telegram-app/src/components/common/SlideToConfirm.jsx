// SlideToConfirm.jsx
import React, { useRef, useState, useLayoutEffect, useEffect } from "react"
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  AnimatePresence,
} from "framer-motion"
import { Check, Loader2 } from "lucide-react"

/**
 * RTL Slide to Confirm
 *
 * Props:
 * - onConfirm: async function called when confirmed (should return/resolve when done)
 * - disabled: boolean (disables interaction)
 * - loading: boolean (display spinner while order is being placed)
 * - text: string (center label)
 */
const SlideToConfirm = ({
  onConfirm,
  disabled = false,
  loading = false,
  text = "إرسال الطلب",
}) => {
  // Refs & measurements
  const containerRef = useRef(null)
  const knobRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [knobWidth, setKnobWidth] = useState(48) // default
  const [locked, setLocked] = useState(false) // lock during confirm
  const [confirmed, setConfirmed] = useState(false)

  // Motion values
  const dragX = useMotionValue(0) // raw drag value (0 .. -travel)
  // Spring follows dragX to make motion viscous and smooth
  const springX = useSpring(dragX, { stiffness: 500, damping: 50 })

  // Derived visual values
  const travel = Math.max(0, containerWidth - knobWidth - 4) // keep small margins
  // Width of fill grows from 0% to 100% as knob moves left
  const progress = useTransform(springX, [0, -travel], [0, 1], {
    clamp: true,
  })
  const fillWidth = useTransform(progress, (p) => `${Math.min(100, Math.max(0, p * 100))}%`)
  // Text opacity fades away as user slides
  const textOpacity = useTransform(progress, [0, 0.4], [1, 0], { clamp: true })

  // Shimmer progress for idle hint (0..1)
  const [showShimmer, setShowShimmer] = useState(true)

  // Accessibility: compute threshold dynamically
  const threshold = Math.max(0.5 * travel, travel * 0.72) // require significant drag

  // Measure container & knob sizes
  useLayoutEffect(() => {
    const measure = () => {
      const c = containerRef.current
      const k = knobRef.current
      if (c) setContainerWidth(Math.round(c.getBoundingClientRect().width))
      if (k) setKnobWidth(Math.round(k.getBoundingClientRect().width))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    if (knobRef.current) ro.observe(knobRef.current)
    return () => ro.disconnect()
  }, [])

  // When loading starts, lock knob at end (if it's confirming)
  useEffect(() => {
    if (loading && !locked) {
      // optionally we could snap knob to end; but we let confirm sequence handle it
    }
  }, [loading, locked])

  // Reset after succeeded
  const reset = (delay = 1200) => {
    setTimeout(() => {
      dragX.set(0)
      setConfirmed(false)
      setLocked(false)
      setShowShimmer(true)
    }, delay)
  }

  // Handle drag end: decide confirm or reset
  const handleDragEnd = async (_, info) => {
    if (disabled || locked) {
      dragX.set(0)
      return
    }

    const offsetX = info.offset.x // negative when dragged left
    // Confirm when we moved far enough left
    if (offsetX < -threshold) {
      setLocked(true)
      setShowShimmer(false)
      // Snap to the full travel to show completion
      dragX.set(-travel)
      try {
        // await user's confirm action
        await onConfirm?.()
        // show success overlay
        setConfirmed(true)
        // keep success for a bit, then reset
        reset(1500)
      } catch (err) {
        // If confirmation failed, release the knob and show hint again
        console.error("SlideToConfirm onConfirm error:", err)
        setLocked(false)
        dragX.set(0)
        setShowShimmer(true)
      }
    } else {
      // Not enough drag: spring back
      dragX.set(0)
      setShowShimmer(true)
    }
  }

  // Keyboard support: Left arrow triggers slide-to-confirm for RTL
  const handleKeyDown = (e) => {
    if (disabled || locked) return
    if (e.key === "ArrowLeft") {
      // Trigger confirm programmatically
      ;(async () => {
        setLocked(true)
        setShowShimmer(false)
        dragX.set(-travel)
        try {
          await onConfirm?.()
          setConfirmed(true)
          reset(1500)
        } catch (err) {
          console.error("SlideToConfirm onConfirm error:", err)
          setLocked(false)
          dragX.set(0)
          setShowShimmer(true)
        }
      })()
    } else if (e.key === "Escape") {
      dragX.set(0)
    }
  }

  // Prevent pointer events while locked
  const pointerEventsStyle = disabled || locked ? { pointerEvents: "none" } : {}

  return (
    <div className="w-full flex justify-center" aria-hidden={false}>
      <div
        ref={containerRef}
        className="relative w-full max-w-xl px-2"
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={text}
        aria-disabled={disabled || locked || loading}
        style={{ outline: "none" }}
      >
        <motion.div
          className={`relative h-14 rounded-full overflow-hidden border border-gray-200 shadow-sm flex items-center justify-center bg-white`}
          style={{
            background: "linear-gradient(90deg, #fbfdff 0%, #f6f9fb 100%)",
            userSelect: "none",
            touchAction: "pan-y",
            ...pointerEventsStyle,
          }}
        >
          {/* Fill track (grows from right -> left) */}
          <motion.div
            aria-hidden
            className="absolute top-0 bottom-0 right-0 rounded-full"
            style={{
              width: fillWidth,
              background: "linear-gradient(to left, #2563eb, #1e40af)",
              boxShadow: "inset 0 0 12px rgba(37,99,235,0.08)",
            }}
          />

          {/* Center label */}
          <motion.span
            className="absolute z-10 text-gray-800 font-semibold select-none pointer-events-none"
            style={{
              opacity: textOpacity,
              // keep Arabic alignment crisp
              letterSpacing: "0.2px",
            }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span className="text-white font-semibold">{text}</span>
              </span>
            ) : (
              text
            )}
          </motion.span>

          {/* Idle shimmer hint */}
          <AnimatePresence>
            {showShimmer && !locked && !loading && (
              <motion.div
                className="absolute right-0 top-0 bottom-0 z-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.9, 0],
                }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                {/* moving gradient */}
                <motion.div
                  initial={{ x: "120%" }}
                  animate={{ x: ["120%", "-40%"] }}
                  transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut", delay: 0.6 }}
                  style={{
                    width: "60%",
                    height: "100%",
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.0) 100%)",
                    transform: "skewX(-18deg)",
                    borderRadius: 999,
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Draggable knob: always mounted for hook stability */}
          <motion.div
            ref={knobRef}
            className="absolute right-1 top-1 bottom-1 w-12 rounded-full flex items-center justify-center z-20"
            drag="x"
            dragConstraints={{ left: -travel, right: 0 }}
            dragElastic={0.08}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            style={{
              x: springX,
              background: "linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)",
              boxShadow: "0 6px 18px rgba(30,64,175,0.18)",
              cursor: disabled || locked ? "default" : "grab",
            }}
            whileTap={{ scale: disabled || locked ? 1 : 0.96 }}
            whileHover={{ scale: disabled || locked ? 1 : 1.03 }}
            aria-hidden={false}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={Math.min(1, Math.max(0, Number(progress.get())))}
            tabIndex={-1}
          >
            <div className="flex items-center justify-center w-full h-full">
              {locked || loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Check className="w-5 h-5 text-white" />
              )}
            </div>
          </motion.div>

          {/* Confirm success overlay */}
          <AnimatePresence>
            {confirmed && (
              <motion.div
                className="absolute inset-0 z-30 flex items-center justify-center rounded-full"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                aria-hidden
              >
                <div className="px-6 py-2 bg-green-500 rounded-full shadow-md">
                  <span className="text-white font-semibold">✅ تم الإرسال</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

export default SlideToConfirm
