import logo from "./logo.svg";
import "./App.css";
import { Outlet } from "react-router-dom";
import { Provider, createStore } from "jotai";

function App() {
  const myStore = createStore();
  return (
    <Provider store={myStore}>
      <div className="App">
        <Outlet />
      </div>
    </Provider>
  );
}

export default App;
