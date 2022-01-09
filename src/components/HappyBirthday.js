/* Based on <https://codepen.io/arcs/pen/XKKYZW> */
import React, { useEffect, useState } from "react"

const PI2 = Math.PI * 2
const random = (min, max) => (Math.random() * (max - min + 1) + min) | 0

class Container {
  constructor(canvas) {
    this.canvas = canvas
    this.resize()

    // create a lovely place to store the firework
    this.fireworks = []
    this.counter = 0
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth
    let center = (this.width / 2) | 0
    this.spawnA = (center - center / 4) | 0
    this.spawnB = (center + center / 4) | 0

    this.height = this.canvas.height = window.innerHeight
    this.spawnC = this.height * 0.1
    this.spawnD = this.height * 0.5
  }

  onClick(evt) {
    let x = evt.clientX || (evt.touches && evt.touches[0].pageX)
    let y = evt.clientY || (evt.touches && evt.touches[0].pageY)

    let count = random(3, 5)
    for (let i = 0; i < count; i++)
      this.fireworks.push(
        new Firework(
          random(this.spawnA, this.spawnB),
          this.height,
          x,
          y,
          random(0, 260),
          random(30, 110)
        )
      )

    this.counter = -1
  }

  update(delta) {
    const ctx = this.canvas.getContext("2d")
    ctx.globalCompositeOperation = "hard-light"
    ctx.fillStyle = `rgba(20,20,20,${7 * delta})`
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.globalCompositeOperation = "lighter"
    for (let firework of this.fireworks) firework.update(ctx, this, delta)

    // if enough time passed... create new new firework
    this.counter += delta * 3 // each second
    if (this.counter >= 1) {
      this.fireworks.push(
        new Firework(
          random(this.spawnA, this.spawnB),
          this.height,
          random(0, this.width),
          random(this.spawnC, this.spawnD),
          random(0, 360),
          random(30, 110)
        )
      )
      this.counter = 0
    }

    // remove the dead fireworks
    if (this.fireworks.length > 1000)
      this.fireworks = this.fireworks.filter(firework => !firework.dead)
  }
}

class Firework {
  constructor(x, y, targetX, targetY, shade, offsprings) {
    this.dead = false
    this.offsprings = offsprings

    this.x = x
    this.y = y
    this.targetX = targetX
    this.targetY = targetY

    this.shade = shade
    this.history = []
  }
  update(ctx, container, delta) {
    if (this.dead) return

    let xDiff = this.targetX - this.x
    let yDiff = this.targetY - this.y
    if (Math.abs(xDiff) > 3 || Math.abs(yDiff) > 3) {
      // still moving
      this.x += xDiff * 2 * delta
      this.y += yDiff * 2 * delta

      this.history.push({
        x: this.x,
        y: this.y,
      })

      if (this.history.length > 20) this.history.shift()
    } else {
      if (this.offsprings && !this.madeChilds) {
        let babies = this.offsprings / 2
        for (let i = 0; i < babies; i++) {
          let targetX =
            (this.x + this.offsprings * Math.cos((PI2 * i) / babies)) | 0
          let targetY =
            (this.y + this.offsprings * Math.sin((PI2 * i) / babies)) | 0

          container.fireworks.push(
            new Firework(this.x, this.y, targetX, targetY, this.shade, 0)
          )
        }
      }
      this.madeChilds = true
      this.history.shift()
    }

    if (this.history.length === 0) {
      this.dead = true
    } else if (this.offsprings) {
      for (let i = 0; this.history.length > i; i++) {
        let point = this.history[i]
        ctx.beginPath()
        ctx.fillStyle = "hsl(" + this.shade + ",100%," + i + "%)"
        ctx.arc(point.x, point.y, 1, 0, PI2, false)
        ctx.fill()
      }
    } else {
      ctx.beginPath()
      ctx.fillStyle = "hsl(" + this.shade + ",100%,50%)"
      ctx.arc(this.x, this.y, 1, 0, PI2, false)
      ctx.fill()
    }
  }
}

const HappyBirthday = ({ message, style }) => {
  useEffect(() => {
    let then = new Date().getTime()
    const canvas = document.getElementById("birthday")
    const birthday = new Container(canvas)

    const onResize = () => birthday.resize()
    const onClick = evt => birthday.onClick(evt)

    window.addEventListener("resize", onResize)
    document.addEventListener("click", onClick)
    document.addEventListener("touchstart", onClick)

    function loop() {
      requestAnimationFrame(loop)

      let now = new Date().getTime()
      let delta = now - then

      then = now
      birthday.update(delta / 1000)
    }

    loop()

    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("click", onClick)
      window.removeEventListener("touchstart", onClick)
    }
  }, [])

  return (
    <div
      style={{
        margin: 0,
        backgroundColor: "#020202",
        cursor: "crosshair",
        ...style,
      }}
    >
      <h1
        style={{
          position: "absolute",
          display: "flex",
          justifyContent: "center",
          top: "20%",
          // left: "50%",
          // transform: "translate(-50%, -50%)",
          color: "#fff",
          width: "100%",
          fontFamily: "Source Sans Pro",
          fontSize: "2em",
          fontWeight: 900,
          userSelect: "none",
        }}
      >
        {message || "Happy Birthday"}
      </h1>
      <canvas id="birthday" style={{ display: "block" }} />
    </div>
  )
}

export default HappyBirthday
