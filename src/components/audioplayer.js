import React, { useMemo, useState } from "react"
import Slider, { createSliderWithTooltip } from "rc-slider"
import { Howl } from "howler"

import "rc-slider/assets/index.css"

const SliderWithTooltip = createSliderWithTooltip(Slider)

const formatTime = secs => {
  secs = parseInt(secs)
  const minutes = Math.floor(secs / 60) || 0
  const seconds = secs - minutes * 60 || 0

  return minutes + ":" + (seconds < 10 ? "0" : "") + seconds
}

const ControlButton = ({ onClick, playing, style }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
      viewBox="0 0 36 36"
      style={style}
    >
      <circle fill="#373D3F" cx="18" cy="18" r="18" />
      <g>
        {!playing ? (
          <polygon fill="#CDD7DB" points="14,11 26,18 14,25" />
        ) : (
          <g>
            <rect x="12" y="11" fill="#CDD7DB" width="4" height="14" />
            <rect x="20" y="11" fill="#CDD7DB" width="4" height="14" />
          </g>
        )}
      </g>
    </svg>
  )
}

const AudioPlayer = ({ src, style, onAfterChange }) => {
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const sound = useMemo(() => {
    /**
     * The step called within requestAnimationFrame to update the playback position.
     */
    const step = () => {
      const seek = sound.seek() || 0
      setProgress(seek)

      // If the sound is still playing, continue stepping.
      if (sound.playing()) {
        requestAnimationFrame(step)
      }
    }

    return new Howl({
      src: Array.isArray(src) ? src : [src],
      html5: true, // Force to HTML5 so that the audio can stream in (best for large files).
      loop: true,
      onload() {
        setLoading(false)
      },
      onplay() {
        requestAnimationFrame(step)
      },
      onpause() {},
      onstop() {},
      onend() {
        setTimeout(() => {
          sound.pause()
          setPlaying(false)
        })
      },
      onseek() {
        requestAnimationFrame(step)
      },
    })
  }, [])

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        padding: "12px 8px",
        backgroundColor: "#282f31",
        color: "#fff",
        ...style,
      }}
    >
      {!loading && (
        <>
          <time
            style={{
              position: "absolute",
              left: 67,
              bottom: 2,
              fontSize: 13,
            }}
          >
            {formatTime(progress)}
          </time>
          <time
            style={{
              position: "absolute",
              right: 6,
              bottom: 2,
              fontSize: 13,
            }}
          >
            {formatTime(sound.duration())}
          </time>
        </>
      )}
      <ControlButton
        playing={playing}
        style={{ width: 42, height: 42 }}
        onClick={() => {
          if (sound.playing()) {
            setPlaying(false)
            sound.pause()
          } else {
            setPlaying(true)
            sound.play()
          }
        }}
      />
      <SliderWithTooltip
        key={loading}
        style={{ marginLeft: 18, flexGrow: 1, width: "auto" }}
        min={0}
        max={parseInt(sound.duration())}
        step={1}
        tipFormatter={value => formatTime(value)}
        value={progress}
        onBeforeChange={() => {
          sound.pause()
        }}
        onChange={value => {
          setProgress(value)
        }}
        onAfterChange={value => {
          sound.seek(value)
          if (playing) {
            sound.play()
          }
          onAfterChange && onAfterChange(value)
        }}
        railStyle={{ backgroundColor: "rgb(72,72,72)", height: 3 }}
        handleStyle={{
          borderColor: "transparent",
          height: 15,
          width: 15,
          marginTop: -7,
          backgroundColor: "rgba(205, 215, 219)",
        }}
        trackStyle={{ backgroundColor: "#6e9541", height: 3 }}
      />
    </div>
  )
}

export default AudioPlayer
