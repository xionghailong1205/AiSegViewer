import { useEffect, useRef } from "react"
import { initCornerstoneCore } from "./utils/initCornerstoneCore"
import { getSEGService } from "./service/segService"
import Content from "./view/Content/Content"
import { ContextMenu } from "./view/component/ContextMenu"

function App() {
  const running = useRef(false)

  useEffect(() => {
    const setup = async () => {
      if (running.current) {
        return
      }

      running.current = true

      initCornerstoneCore().then(result => {
        console.log(result)
        const SEGService = getSEGService()
        setTimeout(() => {
          SEGService.initSegMode()
        }, 1000)
      })
    }

    setup()
  }, [running])


  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        minWidth: "1200px",
      }}
    >
      <Content />
      <ContextMenu />
    </div>
  )
}

export default App
