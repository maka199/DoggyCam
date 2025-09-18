# 🐕 DoggyCam

Watch what your dog is doing through your mobile devices with real-time video streaming!

![DoggyCam Homepage](https://github.com/user-attachments/assets/c64a62bd-d4f6-46d0-9a71-1c3833279e9c)

## Features

- **Real-time video streaming** between two devices using WebRTC
- **Easy device pairing** with Room ID system
- **Mobile and desktop compatible** - works in any modern web browser
- **No app installation required** - runs entirely in the browser
- **Secure peer-to-peer connection** for low latency
- **Automatic reconnection** handling

## How It Works

DoggyCam connects two devices for remote dog monitoring:

1. **Monitor Device (Home)** - Set up at home to watch your dog
2. **Viewer Device (Remote)** - Take with you to view the live stream

The devices connect directly to each other using WebRTC technology for the best possible video quality and minimal delay.

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/maka199/DoggyCam.git
cd DoggyCam

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000`

### 2. Setup Monitor Device (Home)

1. On the device staying at home, open: `http://localhost:3000/monitor`
2. Allow camera access when prompted
3. Note the **Room ID** that appears
4. Leave this device running to monitor your dog

![Monitor Device](https://github.com/user-attachments/assets/b07eaa66-ef4e-4dd5-83c9-e3cc26a97091)

### 3. Setup Viewer Device (Remote)

1. On your mobile device, open: `http://localhost:3000/view`
2. Enter the **Room ID** from the monitor device
3. Tap "Connect" to start viewing the live stream

![Viewer Device](https://github.com/user-attachments/assets/70040ce5-33ed-4314-9175-34a8df6fe932)

## Usage Tips

- **Camera Selection**: The monitor device will automatically use the back camera on mobile devices
- **Network Requirements**: Both devices need internet access, but the video streams directly between them
- **Multiple Viewers**: You can connect multiple viewer devices to the same monitor
- **Reconnection**: If the connection drops, simply refresh the viewer device and reconnect

## Technical Details

### Architecture

- **Backend**: Node.js with Express and Socket.IO for signaling
- **Frontend**: Pure HTML5, CSS3, and JavaScript
- **Real-time Communication**: WebRTC for peer-to-peer video streaming
- **Signaling**: WebSocket connections via Socket.IO

### Browser Support

DoggyCam works on any modern browser that supports WebRTC:

- Chrome 23+
- Firefox 22+
- Safari 11+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile, etc.)

### Network Configuration

- **Ports**: Default port 3000 (configurable via PORT environment variable)
- **STUN Servers**: Uses Google's public STUN servers for NAT traversal
- **Firewall**: May require port forwarding for remote access outside local network

## Development

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### Project Structure

```
DoggyCam/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── public/
│   ├── index.html         # Landing page
│   ├── monitor.html       # Monitor device interface
│   └── view.html          # Viewer device interface
└── README.md
```

## Deployment

For remote access outside your local network:

1. **Port Forwarding**: Configure your router to forward port 3000
2. **Cloud Hosting**: Deploy to services like Heroku, DigitalOcean, or AWS
3. **HTTPS**: For production use, enable HTTPS (required for camera access on remote domains)

## Security Notes

- Camera access requires user permission
- Video streams are peer-to-peer (not stored on server)
- Room IDs are randomly generated UUIDs
- Consider using HTTPS in production environments

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Check if another application is using the camera
- Try refreshing the monitor page

### Connection Issues
- Verify both devices are connected to the internet
- Check if firewall is blocking the connection
- Try using different browsers

### Poor Video Quality
- Check network bandwidth on both devices
- Ensure strong WiFi/cellular signal
- Close other applications using network resources

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
