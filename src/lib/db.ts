import { createClient } from '@supabase/supabase-js';

export type UrgencyLevel = 'URGENT' | 'RECOMMENDED' | 'MONITOR';
export type InspectionStatus = 'AWAITING_INSPECTION' | 'SENT' | 'APPROVED' | 'DECLINED' | 'ARCHIVED';

export interface Inspection {
  id: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  vin?: string;
  customerPhone: string;
  repairName: string;
  estimatedCost: number;
  urgency: UrgencyLevel;
  status: InspectionStatus;
  videoUrl?: string;
  signature?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  supabaseUrl !== 'your_supabase_project_url'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Helper to generate RFC4122 v4 compliant UUIDs
export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Mock database store for local fallback when Supabase is not configured
const MOCK_STORAGE_KEY = 'shopsnap_mock_inspections';

const initialMocks: Inspection[] = [];

// Helper to interact with Mock database (LocalStorage client-side, In-memory server-side fallback)
let serverMemoryMocks = [...initialMocks];

function getMockData(): Inspection[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initialMocks));
      return initialMocks;
    }
    return JSON.parse(data);
  }
  return serverMemoryMocks;
}

function saveMockData(data: Inspection[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
    // Trigger custom storage event for tab synchronization
    window.dispatchEvent(new Event('storage_updated'));
  } else {
    serverMemoryMocks = data;
  }
}

export const db = {
  async list(): Promise<Inspection[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        vehicleYear: row.vehicle_year,
        vehicleMake: row.vehicle_make,
        vehicleModel: row.vehicle_model,
        vin: row.vin,
        customerPhone: row.customer_phone,
        repairName: row.repair_name,
        estimatedCost: Number(row.estimated_cost),
        urgency: row.urgency,
        status: row.status,
        videoUrl: row.video_url,
        signature: row.signature,
        approvedAt: row.approved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }
    
    return getMockData().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async get(id: string): Promise<Inspection | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return {
        id: data.id,
        vehicleYear: data.vehicle_year,
        vehicleMake: data.vehicle_make,
        vehicleModel: data.vehicle_model,
        vin: data.vin,
        customerPhone: data.customer_phone,
        repairName: data.repair_name,
        estimatedCost: Number(data.estimated_cost),
        urgency: data.urgency,
        status: data.status,
        videoUrl: data.video_url,
        signature: data.signature,
        approvedAt: data.approved_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }
    
    const item = getMockData().find(i => i.id === id);
    return item || null;
  },

  async create(inspection: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Inspection> {
    const now = new Date().toISOString();
    const newId = inspection.id || generateUUID();
    const newRecord: Inspection = {
      ...inspection,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('inspections')
        .insert([{
          id: newRecord.id,
          vehicle_year: newRecord.vehicleYear,
          vehicle_make: newRecord.vehicleMake,
          vehicle_model: newRecord.vehicleModel,
          vin: newRecord.vin,
          customer_phone: newRecord.customerPhone,
          repair_name: newRecord.repairName,
          estimated_cost: newRecord.estimatedCost,
          urgency: newRecord.urgency,
          status: newRecord.status,
          video_url: newRecord.videoUrl,
          signature: newRecord.signature,
          approved_at: newRecord.approvedAt,
        }])
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        vehicleYear: data.vehicle_year,
        vehicleMake: data.vehicle_make,
        vehicleModel: data.vehicle_model,
        vin: data.vin,
        customerPhone: data.customer_phone,
        repairName: data.repair_name,
        estimatedCost: Number(data.estimated_cost),
        urgency: data.urgency,
        status: data.status,
        videoUrl: data.video_url,
        signature: data.signature,
        approvedAt: data.approved_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const current = getMockData();
    current.push(newRecord);
    saveMockData(current);
    return newRecord;
  },

  async update(id: string, updates: Partial<Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Inspection> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      const dbUpdates: any = { updated_at: now };
      if (updates.vehicleYear !== undefined) dbUpdates.vehicle_year = updates.vehicleYear;
      if (updates.vehicleMake !== undefined) dbUpdates.vehicle_make = updates.vehicleMake;
      if (updates.vehicleModel !== undefined) dbUpdates.vehicle_model = updates.vehicleModel;
      if (updates.vin !== undefined) dbUpdates.vin = updates.vin;
      if (updates.customerPhone !== undefined) dbUpdates.customer_phone = updates.customerPhone;
      if (updates.repairName !== undefined) dbUpdates.repair_name = updates.repairName;
      if (updates.estimatedCost !== undefined) dbUpdates.estimated_cost = updates.estimatedCost;
      if (updates.urgency !== undefined) dbUpdates.urgency = updates.urgency;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
      if (updates.signature !== undefined) dbUpdates.signature = updates.signature;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;

      const { data, error } = await supabase
        .from('inspections')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        vehicleYear: data.vehicle_year,
        vehicleMake: data.vehicle_make,
        vehicleModel: data.vehicle_model,
        vin: data.vin,
        customerPhone: data.customer_phone,
        repairName: data.repair_name,
        estimatedCost: Number(data.estimated_cost),
        urgency: data.urgency,
        status: data.status,
        videoUrl: data.video_url,
        signature: data.signature,
        approvedAt: data.approved_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const current = getMockData();
    const index = current.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Inspection not found');

    const updatedRecord = {
      ...current[index],
      ...updates,
      updatedAt: now,
    };
    current[index] = updatedRecord;
    saveMockData(current);
    return updatedRecord;
  }
};
