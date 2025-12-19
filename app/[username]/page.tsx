import React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import MakePaymentClient from './MakePaymentClient';
import { connectToDatabase } from '@/app/db/connectdb';
import User from '@/app/models/User';
import Transaction from '@/app/models/Transaction';
import type { ReactElement } from 'react';
import type { ITransaction } from '@/app/models/Transaction';
import { UserProfileClient } from './ClientComponents';

interface UserPageProps {
    params: Promise<{ username: string }>;
}

// Define a new interface for the transaction after population
interface IPopulatedTransaction extends Omit<ITransaction, 'fromUserId'> {
    fromUserId: {
        name: string;
        username: string;
        profilepic?: { url: string };
    } | null;
}


export default async function UsernamePage({ params }: UserPageProps): Promise<ReactElement> {
    const { username } = await params;

    const isValidUsername = /^[a-zA-Z0-9_.]{2,30}$/.test(username);
    if (!isValidUsername) {
        notFound();
    }

    await connectToDatabase();

    const searchUsername = username.toLowerCase();

    const user = await User.findOne({
        username: searchUsername
    }).lean();

    if (!user) {
        notFound();
    }

    if (!user.email || !user.username) {
        notFound();
    }

    let recentTransactions: IPopulatedTransaction[] = []; 
    let totalDonors = 0;
    let lastMonthAmount = 0;

    try {
        const userId = user._id;
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const [recentTransactionsData, uniqueDonors, lastMonthTransactions] = await Promise.all([
            Transaction.find({
                toUserId: userId,
                type: "transfer",
                status: "success"
            })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('fromUserId', 'name username profilepic')
            .lean(),

            Transaction.distinct('fromUserId', {
                toUserId: userId,
                type: "transfer",
                status: "success"
            }),

            Transaction.find({
                toUserId: userId,
                type: "transfer",
                status: "success",
                createdAt: { $gte: oneMonthAgo }
            }).select('amountPaise').lean()
        ]);

        recentTransactions = recentTransactionsData as IPopulatedTransaction[];
        totalDonors = uniqueDonors.length;

        lastMonthAmount = lastMonthTransactions.reduce((sum, transaction) => {
            return sum + (transaction.amountPaise || 0);
        }, 0) / 100;
    } catch (error) {
        console.error('Error fetching transaction data:', error);
        // Continue with default values already initialized
    }

    const defaultProfile = 'https://www.pngmart.com/files/23/Profile-PNG-Photo.png';
    const defaultCover = 'https://static.vecteezy.com/system/resources/previews/026/716/419/large_2x/illustration-image-of-landscape-with-country-road-empty-asphalt-road-on-blue-cloudy-sky-background-multicolor-vibrant-outdoors-horizontal-image-generative-ai-illustration-photo.jpg';

    const coverUrl = user.coverpic?.url || defaultCover;
    const profileUrl = user.profilepic?.url || defaultProfile;
    const bio = user.bio || 'Creating amazing content for the community!';

    return (
        <>
            <div className='cover w-full relative mb-16 md:mb-20'>
                <Image
                    src={coverUrl}
                    alt={`Cover image for ${username}`}
                    className='object-cover w-full h-[200px] md:h-[350px]'
                    width={1920}
                    height={350}
                    priority
                />
                <div className='absolute -bottom-14 md:-bottom-20 left-1/2 -translate-x-1/2'>
                    <Image
                        src={profileUrl}
                        alt={`Profile picture for ${username}`}
                        className='w-28 h-28 md:w-40 md:h-40 rounded-full border-4 border-white object-cover'
                        width={160}
                        height={160}
                        priority
                    />
                </div>
            </div>

            <div className='info flex flex-col items-center p-4 gap-2'>
                <div className='text-2xl font-bold'>@{username}</div>
                <div className='text-slate-400 text-center max-w-md'>{bio}</div>
                <div className='text-slate-400 text-sm flex gap-4 items-center justify-center mt-2'>
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-white">{totalDonors}</span>
                        <span>Supporters</span>
                    </div>
                    <div className="h-8 w-px bg-gray-700"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-white">₹{lastMonthAmount.toLocaleString('en-IN')}</span>
                        <span>Last Month</span>
                    </div>
                </div>
                <div className="mt-4">
                    {/* Render client component wrapper */}
                    <UserProfileClient 
                        userId={user._id.toString()} 
                    />
                </div>
            </div>

            <div className='payment flex gap-3 w-full px-[10%] my-10'>
                <div className='supporters w-1/2 bg-slate-900 rounded-lg p-6'>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className='font-bold text-xl'>Recent Supporters</h2>
                        <div className="text-sm text-gray-400">{totalDonors} total</div>
                    </div>

                    {recentTransactions.length > 0 ? (
                        <ul className='space-y-6 max-h-[500px] overflow-y-auto pr-2'>
                            {recentTransactions.map((transaction) => {
                                const donorName = transaction.fromUserId?.name || transaction.fromUserId?.username || 'Anonymous';
                                const donorProfile = transaction.fromUserId?.profilepic?.url || defaultProfile;
                                const amount = (transaction.amountPaise / 100).toLocaleString('en-IN');
                                const message = transaction.meta?.message || '';

                                const txDate = new Date(transaction.createdAt);
                                const today = new Date();
                                const diffTime = Math.abs(today.getTime() - txDate.getTime());
                                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                                let dateDisplay;
                                if (diffDays === 0) {
                                    dateDisplay = 'Today';
                                } else if (diffDays === 1) {
                                    dateDisplay = 'Yesterday';
                                } else if (diffDays < 7) {
                                    dateDisplay = `${diffDays} days ago`;
                                } else {
                                    dateDisplay = txDate.toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    });
                                }

                                return (
                                    <li key={transaction._id?.toString()} className='flex gap-3 items-start border-b border-gray-800 pb-6'>
                                        <Image
                                            src={donorProfile}
                                            width={40}
                                            height={40}
                                            className="rounded-full object-cover mt-1 flex-shrink-0"
                                            alt={`${donorName}'s avatar`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="font-medium truncate">{donorName}</div>
                                                <div className="text-green-400 font-bold whitespace-nowrap">₹{amount}</div>
                                            </div>

                                            {message && (
                                                <div className="text-sm text-gray-300 mt-1 break-words">
                                                    &quot;{message}&quot;
                                                </div>
                                            )}

                                            <div className="text-xs text-gray-500 mt-2">
                                                {dateDisplay}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="text-center py-12 bg-gray-800/30 rounded-lg">
                            <div className="text-gray-400 mb-2">No donations yet</div>
                            <div className="text-sm text-gray-500">Be the first to support!</div>
                        </div>
                    )}
                </div>
                <MakePaymentClient username={username} />
            </div>
        </>
    );
}