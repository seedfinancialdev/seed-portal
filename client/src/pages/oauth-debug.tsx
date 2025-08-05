import { GoogleLogin } from "@react-oauth/google";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function OAuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [errorDetails, setErrorDetails] = useState<string>('');

  const handleGoogleSuccess = (credentialResponse: any) => {
    console.log('✅ OAuth Success:', credentialResponse);
    setDebugInfo({
      status: 'SUCCESS',
      credential: !!credentialResponse.credential,
      credentialLength: credentialResponse.credential?.length
    });
  };

  const handleGoogleError = (error: any) => {
    console.error('❌ OAuth Error:', error);
    setErrorDetails(JSON.stringify(error, null, 2));
    setDebugInfo({
      status: 'ERROR',
      error: error
    });
  };

  const collectDiagnosticInfo = () => {
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: {
        origin: window.location.origin,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        port: window.location.port,
        href: window.location.href
      },
      oauth: {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Present' : 'Missing',
        clientIdLength: import.meta.env.VITE_GOOGLE_CLIENT_ID?.length,
        clientIdPrefix: import.meta.env.VITE_GOOGLE_CLIENT_ID?.substring(0, 20) + '...'
      },
      browser: {
        cookiesEnabled: navigator.cookieEnabled,
        language: navigator.language,
        platform: navigator.platform
      }
    };
    
    console.log('🔍 Diagnostic Info:', info);
    return info;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full space-y-6">
        <Card className="bg-white shadow-xl">
          <CardHeader>
            <CardTitle>Google OAuth Diagnostic Tool</CardTitle>
            <CardDescription>
              Debug OAuth configuration issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Current Configuration:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(collectDiagnosticInfo(), null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Test Google OAuth:</h3>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                size="large"
                text="signin_with"
                width="400"
              />
            </div>

            {debugInfo.status && (
              <div>
                <h3 className="font-semibold mb-2">OAuth Result:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}

            {errorDetails && (
              <div>
                <h3 className="font-semibold mb-2 text-red-600">Error Details:</h3>
                <pre className="bg-red-50 p-3 rounded text-sm overflow-auto text-red-800">
                  {errorDetails}
                </pre>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p><strong>Instructions:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Check the console for detailed error messages</li>
                <li>Click the Google sign-in button to test</li>
                <li>Copy the diagnostic info and OAuth result</li>
                <li>Compare with your Google Cloud Console settings</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}