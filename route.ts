import { NextResponse } from 'next/server'

interface BetShareRequest {
  betId: string;
  matchDetails: {
    [key: string]: any;  // Define specific match details structure when available
  };
}

interface FrameMetadata {
  buttons: {
    label: string;
    action: "link" | "post";
    target: string;
  }[];
  image: {
    src: string;
    aspectRatio: string;
  };
  input?: {
    text: string;
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as BetShareRequest;
    
    if (!body.betId) {
      return NextResponse.json(
        { error: 'Missing required field: betId' },
        { status: 400 }
      );
    }

    const frameMetadata: FrameMetadata = {
      buttons: [
        {
          label: "Join Bet",
          action: "link",
          target: `https://parlay.xyz/bet/${body.betId}`
        }
      ],
      image: {
        src: `https://parlay.xyz/api/og/bet/${body.betId}`,
        aspectRatio: "1.91:1"
      },
      input: {
        text: "Enter your prediction..."
      }
    };

    // TODO: Implement actual Farcaster cast creation using the Farcaster Hub API
    // This will require proper authentication and API integration

    return NextResponse.json({ 
      success: true,
      frameMetadata 
    });
  } catch (error) {
    console.error('Error sharing bet:', error);
    return NextResponse.json(
      { error: 'Failed to share bet' },
      { status: 500 }
    );
  }
}
