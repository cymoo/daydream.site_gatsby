import React, { useEffect, useRef } from "react"
import { Howl } from "howler"
// import Bio from "../components/bio"
import Layout from "../components/layout"

const formatTime = secs => {
  const minutes = Math.floor(secs / 60) || 0
  const seconds = secs - minutes * 60 || 0

  return minutes + ":" + (seconds < 10 ? "0" : "") + seconds
}

const Play = () => {
  const sound = useRef(null)
  const process = useRef(null)

  /**
   * Seek to a new position in the currently playing track.
   * @param  {Number} percent Percentage through the song to skip.
   */
  const seek = percent => {
    const obj = sound.current
    if (obj.playing()) {
      obj.seek(obj.duration() * percent)
    }
  }

  /**
   * The step called within requestAnimationFrame to update the playback position.
   */
  const step = () => {
    const obj = sound.current
    const seek = obj.seek() || 0
    process.current.style.width = ((seek / obj.duration()) * 100 || 0) + "%"

    // If the sound is still playing, continue stepping.
    if (obj.playing()) {
      requestAnimationFrame(step)
    }
  }

  useEffect(() => {
    sound.current = new Howl({
      src: ["/demo.mp3"],
      html5: true, // Force to HTML5 so that the audio can stream in (best for large files).
      loop: true,
      onplay() {
        console.log("play")
        requestAnimationFrame(step)
        // console.log(formatTime(Math.round(sound.current.duration())))
      },
      onload() {
        console.log("load")
      },
      onend() {
        console.log("end")
        setTimeout(() => {
          sound.current.pause()
        })
      },
      onpause() {
        console.log("pause")
      },
      onstop() {
        console.log("stop")
      },
      onseek() {
        console.log("seek")
        requestAnimationFrame(step)
      },
    })
  })
  return (
    <Layout includeHeader={false}>
      <div>
        <button
          onClick={() => {
            sound.current.play()
          }}
        >
          play
        </button>
        <button
          onClick={() => {
            sound.current.pause()
          }}
        >
          stop
        </button>
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
            const obj = sound.current
            // if (obj.playing()) {
            obj.seek(obj.duration() * percent)
            // }
          }}
        >
          <div
            id="222"
            ref={process}
            style={{
              backgroundColor: "darkcyan",
              height: "100%",
              width: 0,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </Layout>
  )
}

export default Play
