import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Charities() {
    const [charities, setCharities] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fallback data in case the DB is empty or backend is down during setup
    const fallbackCharities = [
        { name: "World Wildlife Fund", description: "Conserving nature and reducing the most pressing threats to the diversity of life on Earth.", image_url: "https://picsum.photos/seed/nature3/400/250" },
        { name: "Doctors Without Borders", description: "Providing independent, impartial medical humanitarian assistance to the people who need it most.", image_url: "https://picsum.photos/seed/health2/400/250" },
        { name: "Local Youth Foundation", description: "Bringing the sport and its values to underprivileged youth in urban centers.", image_url: "https://picsum.photos/seed/golf1/400/250" },
    ];

    useEffect(() => {
        fetch('http://localhost:5000/api/charities')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setCharities(data);
                } else {
                    setCharities(fallbackCharities);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setCharities(fallbackCharities);
                setLoading(false);
            });
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="text-center mb-16 max-w-2xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-gray-900">Where the Impact Happens</h1>
                <p className="text-lg text-gray-600">Select the cause you want to support with every subscription. 10% of your plan automatically goes to the charity of your choice.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {charities.map((c, i) => (
                    <div key={i} className="bg-white group rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col cursor-pointer">
                        <div className="h-48 overflow-hidden relative bg-gray-100">
                            {c.image_url ? (
                                <img
                                    src={c.image_url}
                                    alt={c.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                    onError={(e) => { e.target.src = `https://placehold.co/400x250/eeeeee/999999?text=${encodeURIComponent(c.name)}`; }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-charity-100 text-charity-900 font-bold text-xl">
                                    {c.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="p-6 flex-grow flex flex-col">
                            <h3 className="text-xl font-bold mb-2 text-gray-900">{c.name}</h3>
                            <p className="text-gray-600 text-sm mb-6 flex-grow">{c.description}</p>
                            <Link to="/auth" className="w-full py-3 rounded-lg border-2 border-black font-semibold hover:bg-black hover:text-white transition text-center block">
                                Support Cause
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
