package com.lovemyfreetime.billiardstrainer;

/** Strict single byte ranges shared by native file/media responses. */
final class AssetRange {
    final long start, count;
    private AssetRange(long start, long count) { this.start=start; this.count=count; }
    static AssetRange parse(String value,long length) {
        if(length<=0||value==null||!value.startsWith("bytes=")||value.indexOf(',')>=0)return null;
        String[] parts=value.substring(6).split("-",-1);
        if(parts.length!=2)return null;
        try {
            if(parts[0].isEmpty()) {
                long suffix=number(parts[1]);if(suffix<=0)return null;
                long start=Math.max(0,length-suffix);return new AssetRange(start,length-start);
            }
            long start=number(parts[0]);if(start>=length)return null;
            long end=parts[1].isEmpty()?length-1:number(parts[1]);if(end<start)return null;
            end=Math.min(end,length-1);return new AssetRange(start,end-start+1);
        }catch(NumberFormatException e){return null;}
    }
    private static long number(String value){if(!value.matches("[0-9]+"))throw new NumberFormatException();return Long.parseLong(value);}
}
