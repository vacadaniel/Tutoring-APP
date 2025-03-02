import React, { useEffect } from 'react'

function App() {
  useEffect(()=>{
    fetch('http://localhost:8081/users')
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.log(err));
  }, [])
  return (
    <div>
        
    </div>
  )
}

export default App