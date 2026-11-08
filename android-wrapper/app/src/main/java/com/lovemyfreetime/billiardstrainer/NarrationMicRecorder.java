package com.lovemyfreetime.billiardstrainer;

import android.media.MediaRecorder;
import android.util.Base64;
import java.io.File;
import java.io.RandomAccessFile;
import java.util.UUID;

/** Local, temporary AAC microphone takes for the non-destructive narration editor. */
final class NarrationMicRecorder {
    private final MainActivity activity;
    private MediaRecorder recorder;
    private File recordingFile, finishedFile;
    private String recordingToken, finishedToken;

    NarrationMicRecorder(MainActivity activity){this.activity=activity;}

    synchronized String begin(){
        if(recorder!=null)return "busy";
        discardFinished();
        File file=null;
        MediaRecorder local=null;
        try {
            file=File.createTempFile("billiards-voice-", ".m4a", activity.getCacheDir());
            local=new MediaRecorder();
            local.setAudioSource(MediaRecorder.AudioSource.MIC);
            local.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            local.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            local.setAudioSamplingRate(44100);
            local.setAudioEncodingBitRate(128000);
            local.setOutputFile(file.getAbsolutePath());
            local.prepare();
            local.start(); // A successful return is required before showing RECORDING.
            recorder=local;
            recordingFile=file;
            recordingToken=UUID.randomUUID().toString();
            return recordingToken;
        }catch(Exception failure){
            if(local!=null)try{local.reset();local.release();}catch(Exception ignored){}
            if(file!=null)file.delete();
            recorder=null;recordingFile=null;recordingToken=null;
            return "error";
        }
    }

    synchronized int level(String token){
        if(recorder==null||token==null||!token.equals(recordingToken))return 0;
        try{return Math.min(100,Math.round(recorder.getMaxAmplitude()*100f/32767f));}
        catch(RuntimeException failure){return 0;}
    }

    synchronized long stop(String token){
        if(recorder==null||token==null||!token.equals(recordingToken))return -1;
        MediaRecorder current=recorder;
        File file=recordingFile;
        recorder=null;recordingFile=null;recordingToken=null;
        boolean saved=false;
        try {
            current.stop();
            saved=file!=null&&file.isFile()&&file.length()>1024;
        }catch(RuntimeException ignored){
            saved=false;
        }finally{
            try{current.reset();}catch(RuntimeException ignored){}
            try{current.release();}catch(RuntimeException ignored){}
        }
        if(!saved){if(file!=null)file.delete();return -1;}
        finishedFile=file;
        finishedToken=token;
        return file.length();
    }

    synchronized String chunk(String token,long position,int size){
        if(token==null||!token.equals(finishedToken)||finishedFile==null||
           position<0||size<=0||size>262144)return "";
        try(RandomAccessFile input=new RandomAccessFile(finishedFile,"r")){
            if(position>=input.length())return "";
            input.seek(position);
            byte[] bytes=new byte[(int)Math.min(size,input.length()-position)];
            input.readFully(bytes);
            return Base64.encodeToString(bytes,Base64.NO_WRAP);
        }catch(Exception ignored){return "";}
    }

    synchronized void clear(String token){
        if(token!=null&&token.equals(finishedToken))discardFinished();
    }

    synchronized void discard(){
        if(recorder!=null){
            try{recorder.stop();}catch(RuntimeException ignored){}
            try{recorder.reset();}catch(RuntimeException ignored){}
            try{recorder.release();}catch(RuntimeException ignored){}
            recorder=null;
        }
        if(recordingFile!=null)recordingFile.delete();
        recordingFile=null;recordingToken=null;
        discardFinished();
    }

    private void discardFinished(){
        if(finishedFile!=null)finishedFile.delete();
        finishedFile=null;finishedToken=null;
    }
}
