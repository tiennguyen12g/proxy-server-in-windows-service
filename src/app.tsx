import {createRoot} from "react-dom/client";
import WrapApp from "./WrapApp";

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<WrapApp />);