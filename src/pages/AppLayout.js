import React, { useEffect, useState } from "react";
import SpalashScreen from "../components/SpalashScreen";
import ToolHeader from "../components/ToolHeader";

import Withlove from "../components/Withlove";
import { useAtom } from "jotai";
import { pageLoading } from "../constants/stateVariables";

function AppLayout({ children }) {
  // const [isLoaded, setIsLoaded] = useState(false)
  const [isPageLoading] = useAtom(pageLoading);

  // useEffect(()=>{
  //   setTimeout(()=>{
  //     setIsLoaded(true)
  //   },1000)
  // })
  return (
    <div>
      <ToolHeader />
      <div style={{ marginTop: "50px" }}>
        {children}
        {isPageLoading && (
          <div className="loadingScreen">
            <SpalashScreen />
          </div>
        )}
        <Withlove/>
      </div>
    </div>
  );
}

export default AppLayout;
