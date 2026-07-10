import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  supabaseUrl !== 'your_supabase_project_url'
);
const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const inspectionId = formData.get('inspectionId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean name to prevent issues
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${inspectionId || 'temp'}-${Date.now()}-${safeName}`;

    // If Supabase is configured, upload to Supabase Storage bucket 'inspection-videos'
    if (supabase) {
      const { data, error } = await supabase.storage
        .from('inspection-videos')
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        throw error;
      }

      // Retrieve public URL for streaming in the client portal
      const { data: { publicUrl } } = supabase.storage
        .from('inspection-videos')
        .getPublicUrl(fileName);

      return NextResponse.json({
        success: true,
        url: publicUrl,
        fileName,
      });
    }

    // Local fallback: Save locally inside Next.js public/uploads directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName,
    });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
