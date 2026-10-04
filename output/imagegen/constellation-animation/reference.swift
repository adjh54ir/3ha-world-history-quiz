import AppKit
import Foundation
let root = CommandLine.arguments[1]
let data = try Data(contentsOf: URL(fileURLWithPath: root + "/leo-layout.json"))
let d = try JSONSerialization.jsonObject(with: data) as! [String: Any]
let points = d["points"] as! [String: [String: Double]]
let edges = d["edges"] as! [[String]]
let b = NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1254,pixelsHigh:1254,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep:b)
NSColor(calibratedRed:0.035,green:0.07,blue:0.14,alpha:1).setFill()
NSRect(x:0,y:0,width:1254,height:1254).fill()
func point(_ key:String)->NSPoint { let p=points[key]!;return NSPoint(x:p["x"]!,y:1254-p["y"]!) }
NSColor.systemYellow.setStroke()
for edge in edges {let p=NSBezierPath();p.lineWidth=3;p.move(to:point(edge[0]));p.line(to:point(edge[1]));p.stroke()}
for (name,_) in points {let p=point(name);NSColor.white.setFill();NSBezierPath(ovalIn:NSRect(x:p.x-7,y:p.y-7,width:14,height:14)).fill();name.draw(at:NSPoint(x:p.x+12,y:p.y+10),withAttributes:[.font:NSFont.systemFont(ofSize:20),.foregroundColor:NSColor.white])}
try b.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:root+"/leo-reference.png"))
print("Saved coordinate reference")
