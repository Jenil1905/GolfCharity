import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',
    { auth: { persistSession: false } }
);

async function seed() {
    const charities = [
        { name: "World Wildlife Fund", description: "Conserving nature and reducing the most pressing threats to the diversity of life on Earth.", image_url: "https://picsum.photos/seed/nature3/400/250", is_featured: true },
        { name: "Doctors Without Borders", description: "Providing independent, impartial medical humanitarian assistance to the people who need it most.", image_url: "https://picsum.photos/seed/health2/400/250", is_featured: true },
        { name: "Local Youth Foundation", description: "Bringing the sport and its values to underprivileged youth in urban centers.", image_url: "https://picsum.photos/seed/golf1/400/250", is_featured: true },
    ];

    const { data, error: countErr } = await supabase.from('charities').select('id');
    if (data && data.length > 0) {
        console.log("Charities already seeded.");
        return;
    }

    const { error } = await supabase.from('charities').insert(charities);
    if (error) {
        console.error("Error seeding charities:", error.message);
    } else {
        console.log("Successfully seeded 3 charities!");
    }
}

seed();
