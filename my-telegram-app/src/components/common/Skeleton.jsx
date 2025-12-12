import { motion } from "framer-motion"

const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={`relative overflow-hidden bg-gray-200/50 rounded-md ${className}`}
            {...props}
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                    repeatType: "loop",
                }}
            />
        </div>
    )
}

export default Skeleton
