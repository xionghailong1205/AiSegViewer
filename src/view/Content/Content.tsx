import ViewportLayouter from "./ViewportLayouter"
import Sidebar from "./Sidebar"

const Content = () => {
    return (
        <div
            style={{
                height: "100%",
                display: "flex",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    flex: "1"
                }}
            >
                <Sidebar />
            </div>
            <div
                style={{
                    flex: "5",
                }}
            >
                <ViewportLayouter />
            </div>
        </div>
    )
}

export default Content