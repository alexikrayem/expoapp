"use client"

// src/components/FeaturedSlider.jsx
import { useRef, useState } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { A11y, EffectCoverflow, Autoplay } from "swiper/modules"
import "./FeaturedSlider.css"
import "swiper/css"
import "swiper/css/effect-coverflow"
import "swiper/css/autoplay"
import FeaturedSliderSkeleton from "./FeaturedSliderSkeleton"
import FeaturedListModal from "./modals/FeaturedListModal"

const FeaturedSlider = ({ items = [], onSlideClick, isLoading = false }) => {
  const swiperRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showListModal, setShowListModal] = useState(false)
  const [selectedList, setSelectedList] = useState(null)

  if (isLoading) {
    return <FeaturedSliderSkeleton />
  }

  if (!items || items.length === 0) {
    return null
  }

  const autoplayDelay = 5000
  const enableLoop = items.length >= 4

  const handleCardClick = (item) => {
    if (item.type === "list") {
      setSelectedList(item)
      setShowListModal(true)
    } else {
      onSlideClick?.(item)
    }
  }

  return (
    <>
      <div className="slideshow-container w-full max-w-6xl mx-auto my-6 relative group px-4">
        <Swiper
          ref={swiperRef}
          modules={[A11y, EffectCoverflow, Autoplay]}
          effect="coverflow"
          grabCursor={true}
          centeredSlides={true}
          loop={enableLoop}
          slidesPerView={1.25}
          spaceBetween={20}
          autoplay={{
            delay: autoplayDelay,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: 100,
            modifier: 2,
            slideShadows: false,
          }}
          breakpoints={{
            320: { slidesPerView: 1.1, spaceBetween: 10 },
            640: { slidesPerView: 1.25, spaceBetween: 15 },
            768: { slidesPerView: 1.5, spaceBetween: 20 },
            1024: { slidesPerView: 2, spaceBetween: 30 },
          }}
          className="!py-2"
        >
          {items.map((item, index) => (
            <SwiperSlide key={`${item.type}-${item.id}`} className="px-1 box-border">
              <div
                className={`slide-inner-card w-full h-[260px] sm:h-[280px] md:h-[300px]
                                    rounded-xl overflow-hidden shadow-lg 
                                    transition-all duration-300 ease-out cursor-pointer
                                    relative ${activeIndex === index ? "scale-100 opacity-100" : "scale-90 opacity-80"}`}
                onClick={() => {
                  if (activeIndex === index) {
                    handleCardClick(item)
                  } else if (swiperRef.current?.swiper) {
                    enableLoop ? swiperRef.current.swiper.slideToLoop(index) : swiperRef.current.swiper.slideTo(index)
                  }
                }}
              >
                <div
                  className="slide-image w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: item.imageUrl?.startsWith("linear-gradient")
                      ? item.imageUrl
                      : `url(${item.imageUrl})`,
                  }}
                >
                  <div className="slide-info absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent text-white">
                    <h3 className="text-base sm:text-lg font-bold mb-0.5 truncate">{item.title}</h3>
                    <p className="text-xs sm:text-sm opacity-80 line-clamp-2 h-[2.5em] sm:h-[2.75em]">
                      {item.description}
                    </p>
                    {item.type === "list" && (
                      <span className="mt-2 inline-block text-xs bg-white/20 px-2 py-1 rounded">
                        {item.listType === "products" ? "📦 Products" : "🎁 Deals"}
                      </span>
                    )}
                  </div>
                </div>

                {activeIndex === index && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 overflow-hidden group-hover:opacity-0 transition-opacity duration-300">
                    <div
                      className="h-full bg-white animate-progress"
                      style={{ animationDuration: `${autoplayDelay}ms` }}
                    />
                  </div>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {showListModal && selectedList && (
        <FeaturedListModal
          isOpen={showListModal}
          onClose={() => setShowListModal(false)}
          list={selectedList}
          onItemClick={onSlideClick}
        />
      )}
    </>
  )
}

export default FeaturedSlider
