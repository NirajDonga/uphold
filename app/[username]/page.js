import React from 'react';
import { notFound } from 'next/navigation';
import MakePaymentClient from './MakePaymentClient';
import { connectToDatabase } from '@/app/db/connectdb';
import User from '@/app/models/User';

export default async function UsernamePage({ params }) {
    // Fix for Next.js 15+ - await params before using
    const { username } = await params;
    
    console.log(`UsernamePage: Processing username: "${username}"`);

    // Updated regex to allow shorter usernames (minimum 2 characters instead of 3)
    // and ensure it matches the User model validation
    const isValidUsername = /^[a-zA-Z0-9_.]{2,30}$/.test(username);
    if (!isValidUsername) {
        console.log(`Invalid username format: ${username}`);
        notFound();
    }
    
    console.log(`UsernamePage: Username "${username}" is valid`);

    await connectToDatabase();
    console.log(`UsernamePage: Connected to database`);
    
    // Find user with exact username match (since DB stores in lowercase)
    // Convert the URL parameter to lowercase for exact match
    const searchUsername = username.toLowerCase();
    console.log(`UsernamePage: Searching for username: "${searchUsername}"`);
    
    const user = await User.findOne({ 
        username: searchUsername
    }).lean();

    if (!user) {
        console.log(`User not found for username: "${searchUsername}"`);
        
        // Let's also check what users exist in the database for debugging
        const allUsers = await User.find({}).select('username email _id').lean();
        console.log(`UsernamePage: All users in database:`, allUsers.map(u => ({ username: u.username, email: u.email })));
        
        notFound();
    }

    // Additional validation to ensure user has completed registration
    if (!user.email || !user.username) {
        console.log(`User incomplete for username: ${username}, email: ${user.email}, username: ${user.username}`);
        notFound();
    }

    // Log successful user lookup for debugging
    console.log(`Found user: ${user.username} (ID: ${user._id})`);

    const defaultProfile = 'https://www.pngmart.com/files/23/Profile-PNG-Photo.png';
    const defaultCover = 'https://static.vecteezy.com/system/resources/previews/026/716/419/large_2x/illustration-image-of-landscape-with-country-road-empty-asphalt-road-on-blue-cloudy-sky-background-multicolor-vibrant-outdoors-horizontal-image-generative-ai-illustration-photo.jpg';

    const coverUrl = user.coverpic?.url || defaultCover;
    const profileUrl = user.profilepic?.url || defaultProfile;
    const bio = user.bio || 'Creating amazing content for the community!';

    return (
        <>
            <div className='cover w-full relative mb-16 md:mb-20'>
                <img
                    src={coverUrl}
                    alt={`Cover image for ${username}`}
                    className='object-cover w-full h-[200px] md:h-[350px]'
                />
                <div className='absolute -bottom-14 md:-bottom-20 left-1/2 -translate-x-1/2'>
                    <img
                        src={profileUrl}
                        alt={`Profile picture for ${username}`}
                        className='w-28 h-28 md:w-40 md:h-40 rounded-full border-4 border-white object-cover'
                    />
                </div>
            </div>

            <div className='info flex flex-col items-center p-4 gap-2'>
                <div className='text-2xl font-bold'>@{username}</div>
                <div className='text-slate-400 text-center max-w-md'>{bio}</div>
                <div className='text-slate-400 text-sm'>9798 members, 82 posts, ₹7,454/releases</div>
            </div>

            <div className='payment flex gap-3 w-full px-[10%] my-10'>
                <div className='suppoters w-1/2 bg-slate-900 rounded-lg p-10'>
                    <h2 className='suppoters font-bold text-xl'>Supporters</h2>
                    <ul className='mx-5 text-lg'>
                        <li className='my-4 flex gap-2 items-center'>
                            <img src={defaultProfile} width={30} alt="supporter icon"/>
                            <span>
                                Shubham donated <span className='font-bold'> ₹{parseInt(30, 10)} </span> with a message "fvesfvsdf sz  f zd dsfdss"
                            </span>
                        </li>
                        <li className='my-4 flex gap-2 items-center'>
                            <img src={defaultProfile} width={30} alt="supporter icon"/>
                            <span>
                                Shubham donated <span className='font-bold'> ₹{parseInt(30, 10)} </span> with a message "fvesfvsdf sz  f zd dsfdss"
                            </span>
                        </li>
                        <li className='my-4 flex gap-2 items-center'>
                            <img src={defaultProfile} width={30} alt="supporter icon"/>
                            <span>
                                Shubham donated <span className='font-bold'> ₹{parseInt(30, 10)} </span> with a message "fvesfvsdf sz  f zd dsfdss"
                            </span>
                        </li>
                        <li className='my-4 flex gap-2 items-center'>
                            <img src={defaultProfile} width={30} alt="supporter icon"/>
                            <span>
                                Shubham donated <span className='font-bold'> ₹{parseInt(30, 10)} </span> with a message "fvesfvsdf sz  f zd dsfdss"
                            </span>
                        </li>
                    </ul>
                </div>
                <MakePaymentClient username={username} />
            </div>
        </>
    );
}