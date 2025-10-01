 
import InfiniteSlider from "../components/common/InfiniteSlider";
import { Camera, Upload, Shield, Zap } from "lucide-react";
 
 function Home(){   
    return  (
    <main className="flex flex-col items-center justify-center min-h-screen p-10 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8">Welcome to My Homepage</h1>
        <br/>
        <br/>
    
      <InfiniteSlider speed={15} speedOnHover={5} gap={24}>
        
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded shadow">
          <Camera className="w-5 h-5" /> <span>Camera</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded shadow">
          <Upload className="w-5 h-5" /> <span>Upload</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded shadow">
          <Shield className="w-5 h-5" /> <span>Secure</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded shadow">
          <Zap className="w-5 h-5" /> <span>Fast</span>
        </div>
      </InfiniteSlider>
    </main>
  );
    
 }

 export default Home