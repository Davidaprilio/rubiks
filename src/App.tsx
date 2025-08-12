import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense, type JSX } from "react";
// import Studio from "./pages/studio";

const routes: {
  path: string;
  element: React.LazyExoticComponent<() => JSX.Element>;
}[] = [
  {
    path: "/",
    element: lazy(() => import("./pages/visualize2d")),
  },
  {
    path: "/cube",
    element: lazy(() => import("./pages/cube")),
  },
];

export default function App() {

  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={<route.element />} />
          ))}
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}


function Loading() {
  return <div>Loading...</div>;
}