import React from 'react'
import { Spin } from 'antd';

function SpalashScreen() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div>
      <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Spin size="large" />
        </div>
      </div>
    </div>
  )
}

export default SpalashScreen