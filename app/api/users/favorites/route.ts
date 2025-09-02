import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/app/db/connectdb';
import User from '@/app/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { logger } from '@/app/lib/logger';

// Connect to the database will be done inside each handler

// GET: Get current user's favorite creators
export async function GET(_req: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get the current user with populated favorites
    const user = await User.findById(userId)
      .populate('favoriteCreators', 'name username image')
      .exec();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ favorites: user.favoriteCreators || [] });
  } catch (error) {
    logger.error('Error fetching favorite creators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorite creators' },
      { status: 500 }
    );
  }
}

// POST: Add a creator to favorites
export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { creatorId } = await req.json();

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    // Validate the creator exists
    const creatorExists = await User.findById(creatorId);
    if (!creatorExists) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Add to favorites if not already added
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize favorites array if it doesn't exist
    if (!user.favoriteCreators) {
      user.favoriteCreators = [];
    }

    // Check if already in favorites
    if (user.favoriteCreators.includes(creatorId)) {
      return NextResponse.json({ message: 'Creator already in favorites' });
    }

    // Add to favorites
    user.favoriteCreators.push(creatorId);
    await user.save();

    return NextResponse.json({ 
      message: 'Added to favorites successfully',
      favoriteCreators: user.favoriteCreators 
    });
  } catch (error) {
    logger.error('Error adding to favorites:', error);
    return NextResponse.json(
      { error: 'Failed to add to favorites' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a creator from favorites
export async function DELETE(req: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { creatorId } = await req.json();

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    // Remove from favorites
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has favorites array
    if (!user.favoriteCreators) {
      return NextResponse.json({ message: 'No favorites to remove from' });
    }

    // Remove from favorites
    user.favoriteCreators = user.favoriteCreators.filter(
      (id: mongoose.Types.ObjectId) => id.toString() !== creatorId
    );
    
    await user.save();

    return NextResponse.json({ 
      message: 'Removed from favorites successfully',
      favoriteCreators: user.favoriteCreators 
    });
  } catch (error) {
    logger.error('Error removing from favorites:', error);
    return NextResponse.json(
      { error: 'Failed to remove from favorites' },
      { status: 500 }
    );
  }
}
