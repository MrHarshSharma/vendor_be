import React, { useEffect, useState } from 'react'
import SpalashScreen from '../components/SpalashScreen'
import ToolHeader from '../components/ToolHeader'

function AppLayout({children}) {
  const [isLoaded, setIsLoaded] = useState(false)
  useEffect(()=>{
    setTimeout(()=>{
      setIsLoaded(true)
    },1000)
  })
  return (
    <div>
    <ToolHeader />
    <div style={{marginTop:'50px'}}>
    {children}
    {!isLoaded && (

      <div className='loadingScreen'>
      <SpalashScreen />
      </div>
      )}
    </div>
    </div>
  )
}

export default AppLayout