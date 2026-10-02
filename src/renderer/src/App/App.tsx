import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import "../shared/design-system/tokens/typography.css";

function App() {
  return <RouterProvider router={router} />;
}
export default App;
