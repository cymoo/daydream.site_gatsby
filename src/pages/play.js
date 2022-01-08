import React, { useEffect, useMemo, useRef, useState } from "react"
import { Howl } from "howler"
import Slider, { createSliderWithTooltip } from "rc-slider"
import "rc-slider/assets/index.css"
// import Bio from "../components/bio"
import Layout from "../components/layout"

const SliderWithTooltip = createSliderWithTooltip(Slider)

const formatTime = secs => {
  const minutes = Math.floor(secs / 60) || 0
  const seconds = secs - minutes * 60 || 0

  return minutes + ":" + (seconds < 10 ? "0" : "") + seconds
}

const PlayBtn = ({ onClick, playing }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
      // width="36px"
      // height="36px"
      viewBox="0 0 36 36"
      style={{
        // margin: "0 15px",
        width: 42,
        height: 42,
      }}
    >
      <g transform="scale(1.0)">
        <circle fill="#373D3F" cx="18" cy="18" r="18" />
        {/*<circle fill="#6e9541" cx="18" cy="18" r="18" />*/}
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
      </g>
    </svg>
  )
}

const Play = () => {
  // const sound = useRef(null)
  const process = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  /**
   * Seek to a new position in the currently playing track.
   * @param  {Number} percent Percentage through the song to skip.
   */
  const seek = percent => {
    if (sound.playing()) {
      sound.seek(sound.duration() * percent)
    }
  }

  /**
   * The step called within requestAnimationFrame to update the playback position.
   */
  const step = () => {
    // const obj = sound.current
    const seek = sound.seek() || 0
    const percent = (seek / sound.duration()) * 100 || 0
    process.current.style.width = percent + "%"

    // TEST
    // setProgress(Math.round(percent))
    setProgress(seek)

    // If the sound is still playing, continue stepping.
    if (sound.playing()) {
      requestAnimationFrame(step)
    }
  }

  const sound = useMemo(() => {
    return new Howl({
      src: ["/demo.mp3"],
      html5: true, // Force to HTML5 so that the audio can stream in (best for large files).
      loop: true,
      onload() {
        console.log("load")
      },
      onplay() {
        console.log("play")
        // setPlaying(true)
        requestAnimationFrame(step)
        // console.log(formatTime(Math.round(sound.current.duration())))
      },
      onpause() {
        // setPlaying(false)
        console.log("pause")
      },
      onstop() {
        console.log("stop")
      },
      onend() {
        console.log("end")
        setTimeout(() => {
          sound.pause()
          setPlaying(false)
        })
      },
      onseek() {
        console.log("seek")
        requestAnimationFrame(step)
      },
    })
  }, [])

  const wave = useRef(null)

  useEffect(() => {
    //
  }, [])

  return (
    <Layout includeHeader={false}>
      <div>
        <button
          onClick={() => {
            setPlaying(true)
            sound.play()
          }}
        >
          play
        </button>
        <button
          onClick={() => {
            setPlaying(false)
            sound.pause()
          }}
        >
          stop
        </button>
        <PlayBtn
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
        <div
          id="111"
          style={{ backgroundColor: "yellowgreen", height: 20 }}
          onClick={event => {
            const el = event.target
            const rect = el.getBoundingClientRect()
            const offset = event.clientX - rect.x
            const percent = offset / rect.width
            console.log(percent)
            // seek(percent)
            // const obj = sound.current
            // if (obj.playing()) {
            sound.seek(sound.duration() * percent)
            // }
          }}
        >
          <div
            id="222"
            ref={process}
            style={{
              marginTop: 30,
              backgroundColor: "darkcyan",
              height: "100%",
              width: 0,
              pointerEvents: "none",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 30,
            display: "flex",
            alignItems: "center",
            padding: "12px 8px",
            backgroundColor: "#282f31",
            color: "#fff",
          }}
        >
          <PlayBtn
            playing={playing}
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
            style={{ marginLeft: 15, flexGrow: 1, width: "auto" }}
            min={0}
            max={sound.duration()}
            step={1}
            tipFormatter={value => {
              const rv = formatTime(value)
              return rv
            }}
            tipProps={{ overlayClassName: "foo" }}
            value={progress}
            onBeforeChange={value => {
              sound.pause()
              console.log("before change")
              console.log(value)
            }}
            onChange={value => {
              console.log("change")
              setProgress(value)
            }}
            onAfterChange={value => {
              console.log("after change")
              sound.seek(
                value
                // Math.round(value * 0.01 * sound.current.duration())
              )
              if (playing) {
                sound.play()
              }
            }}
            railStyle={{ backgroundColor: "rgb(72,72,72)", height: 3 }}
            handleStyle={{
              borderColor: "transparent",
              height: 15,
              width: 15,
              // marginLeft: -14,
              marginTop: -7,
              backgroundColor: "rgba(205, 215, 219)",
            }}
            trackStyle={{ backgroundColor: "#6e9541", height: 3 }}
          />
        </div>
      </div>
    </Layout>
  )
}

export default Play
