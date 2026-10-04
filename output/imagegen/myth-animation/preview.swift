import AppKit
import Foundation

let root = CommandLine.arguments[1]
let data = try Data(contentsOf: URL(fileURLWithPath: root + "/manifest.json"))
let entries = try JSONSerialization.jsonObject(with: data) as! [[String: Any]]
let available = entries.filter { FileManager.default.fileExists(atPath: root + "/\($0["key"] as! String).webp") }
let perPage = 15
for start in stride(from: 0, to: available.count, by: perPage) {
    let page = Array(available[start..<min(start + perPage, available.count)])
    let width = 1000, height = 720
    let canvas = NSImage(size: NSSize(width: width, height: height))
    canvas.lockFocus()
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()
    for (index, entry) in page.enumerated() {
        let key = entry["key"] as! String
        let x = (index % 5) * 200 + 10
        let y = height - (index / 5 + 1) * 240 + 40
        if let picture = NSImage(contentsOfFile: root + "/" + key + ".webp") {
            picture.draw(in: NSRect(x: x, y: y, width: 180, height: 180))
        }
        let label = "\(entry["name"] as! String) · \(key)"
        label.draw(in: NSRect(x: x, y: y - 30, width: 190, height: 26), withAttributes: [.font: NSFont.systemFont(ofSize: 12), .foregroundColor: NSColor.black])
    }
    canvas.unlockFocus()
    let bitmap = NSBitmapImageRep(data: canvas.tiffRepresentation!)!
    let output = bitmap.representation(using: .png, properties: [:])!
    let path = root + "/preview-\(start / perPage + 1).png"
    try output.write(to: URL(fileURLWithPath: path))
    print(path)
}
print("Previewed \(available.count) images")
