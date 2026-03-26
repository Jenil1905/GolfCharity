import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
);

async function seed() {
    const charities = [
        { 
            name: "World Wildlife Fund", 
            description: "Conserving nature and reducing the most pressing threats to the diversity of life on Earth.", 
            image_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=400", 
            is_featured: true,
            category: "Nature",
            upcoming_events: [{ name: "Earth Hour Golf Classic", date: "2024-04-20" }]
        },
        { 
            name: "Doctors Without Borders", 
            description: "Providing independent, impartial medical humanitarian assistance to the people who need it most.", 
            image_url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=400", 
            is_featured: true,
            category: "Medical",
            upcoming_events: [{ name: "Medical Aid Gala", date: "2024-05-15" }]
        },
        { 
            name: "Local Youth Foundation", 
            description: "Bringing the sport and its values to underprivileged youth in urban centers.", 
            image_url: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&q=80&w=400", 
            is_featured: true,
            category: "Youth",
            upcoming_events: [{ name: "Junior Open Day", date: "2024-06-10" }]
        },
    ];

    for (const charity of charities) {
        const { data: existing } = await supabase
            .from('charities')
            .select('id')
            .eq('name', charity.name)
            .single();

        if (existing) {
            // Update existing charity with new fields
            const { error } = await supabase
                .from('charities')
                .update({
                    category: charity.category,
                    upcoming_events: charity.upcoming_events,
                    image_url: charity.image_url,
                    description: charity.description
                })
                .eq('id', existing.id);
            if (error) console.error(`Error updating ${charity.name}:`, error.message);
            else console.log(`Updated ${charity.name} with new categories/events.`);
        } else {
            // Insert new charity
            const { error } = await supabase.from('charities').insert([charity]);
            if (error) console.error(`Error inserting ${charity.name}:`, error.message);
            else console.log(`Inserted ${charity.name}.`);
        }
    }
    console.log("Seeding process complete.");
}

seed();
