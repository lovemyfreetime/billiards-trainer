'use strict';
importScripts('./photo-calibration.js','./photo-corner-sensing.js');
self.onmessage=({data})=>{try{self.postMessage({evidence:self.BilliardsCornerSensing.calibrate(data.img,data.quad,data.options)});}catch(error){self.postMessage({error:error.message});}};
