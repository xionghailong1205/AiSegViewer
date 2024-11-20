import { useEffect, useRef } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { initCornerstoneCore } from "@/utils/initCornerstoneCore";
import { getSEGService } from "@/service/segService";
import Content from "@/view/Content/Content";
import List from "@/view/List";
import { ContextMenu } from "@/view/component/ContextMenu";

function App() {
  const running = useRef(false);

  useEffect(() => {
    const setup = async () => {
      if (running.current) {
        return;
      }

      running.current = true;

      initCornerstoneCore().then((result) => {
        console.log(result);
        const SEGService = getSEGService();
        setTimeout(() => {
          SEGService.initSegMode();
        }, 1000);
      });
    };

    setup();
  }, [running]);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
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
          }
        />
        <Route path="/list" element={<List />} />
      </Routes>
    </Router>
  );
}

export default App;
