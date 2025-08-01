import { CubeFacePOVTop } from "@/components/cubes/pov/CubeFacePOVTop";

function App() {

  return (
    <main className="bg-gray-900 min-h-screen w-full">
      <h1 className="text-white text-2xl text-center font-semibold">Rubiks</h1>
      <div className="mt-10 flex justify-center">
        <CubeFacePOVTop  
          color="w" 
          emptyColor="y"
          tails={[0,1,0, 1,1,1, 1,1,1]} 
          sides={{
            'right': [1, 0, 1],
          }} 
        />
      </div>
    </main>
  )
}

export default App
