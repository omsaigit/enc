# Zerodha Kite Profile Viewer

A web application to fetch and display your Zerodha Kite trading profile information.

## Features

- Beautiful, modern UI with gradient design
- Fetches profile data from Zerodha Kite API
- Displays user information in a clean, organized format
- Handles CORS issues with a Node.js proxy server
- Responsive design that works on all devices

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

## Usage

1. Start the server:

```bash
npm start
```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Click the "Fetch Profile Data" button to retrieve your profile information

## API Details

The application uses the Zerodha Kite API endpoint:
- **URL**: `https://kite.zerodha.com/oms/user/profile`
- **Method**: GET
- **Headers**: 
  - `x-kite-version: 3`
  - `Authorization: enctoken [your-token]`

## Important Notes

- The enctoken in the code is a sample token. You'll need to replace it with your actual Zerodha enctoken
- The enctoken can be obtained from your browser's developer tools when logged into Kite
- Never share your enctoken publicly as it provides access to your trading account

## How to Get Your Enctoken

1. Log in to [Kite](https://kite.zerodha.com/)
2. Open browser developer tools (F12)
3. Go to Application/Storage tab
4. Look for cookies
5. Find the `enctoken` cookie value
6. Copy this value and replace it in the `server.js` file

## Security Warning

⚠️ **Important**: This application is for educational purposes. The enctoken provides access to your trading account, so:
- Never commit your actual enctoken to version control
- Use environment variables for production
- Keep your enctoken secure and private

## Troubleshooting

### CORS Errors
If you see CORS errors, make sure:
- The Node.js server is running on port 3000
- You're accessing the application through `http://localhost:3000`

### API Errors
If the API call fails:
- Check if your enctoken is valid and not expired
- Ensure you have proper permissions for the API
- Verify the Zerodha API is accessible

## Development

To run in development mode with auto-restart:

```bash
npm run dev
```

## Project Structure

```
├── index.html          # Main HTML page
├── server.js           # Node.js server with API proxy
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## License

MIT License - feel free to use and modify as needed. 