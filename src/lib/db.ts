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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Mock database store for local fallback when Supabase is not configured
function getMockData(): Inspection[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('shopsnap_mock_inspections');
  return data ? JSON.parse(data) : [];
}

function saveMockData(data: Inspection[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('shopsnap_mock_inspections', JSON.stringify(data));
}

/**
 * Decodes a database row (from either Supabase snake_case or LocalStorage camelCase)
 * and translates signature-prefixed archive markers and repair_name-packed VIN codes.
 */
function decodeInspection(row: any): Inspection {
  let status: InspectionStatus = row.status || 'AWAITING_INSPECTION';
  let signature: string | undefined = row.signature;

  // Handle DB-safe archive prefix decodes
  if (signature && signature.startsWith('[ARCHIVED_')) {
    status = 'ARCHIVED';
    if (signature.startsWith('[ARCHIVED_APPROVED] ')) {
      signature = signature.replace('[ARCHIVED_APPROVED] ', '');
    } else if (signature.startsWith('[ARCHIVED_DECLINED]')) {
      signature = undefined;
    } else if (signature.startsWith('[ARCHIVED_PENDING]')) {
      signature = undefined;
    }
  }

  let repairName = row.repair_name !== undefined ? row.repair_name : row.repairName;
  let vin = row.vin;

  // Extract packed VIN from repairName if the column was missing during insert
  if (repairName && repairName.includes(' [VIN:')) {
    const match = repairName.match(/\s\[VIN:([A-Z0-9]{17})\]/i);
    if (match) {
      vin = match[1];
      repairName = repairName.replace(/\s\[VIN:[A-Z0-9]{17}\]/i, '');
    }
  }

  return {
    id: row.id,
    vehicleYear: row.vehicle_year !== undefined ? row.vehicle_year : row.vehicleYear,
    vehicleMake: row.vehicle_make !== undefined ? row.vehicle_make : row.vehicleMake,
    vehicleModel: row.vehicle_model !== undefined ? row.vehicle_model : row.vehicleModel,
    vin,
    customerPhone: row.customer_phone !== undefined ? row.customer_phone : row.customerPhone,
    repairName,
    estimatedCost: Number(row.estimated_cost !== undefined ? row.estimated_cost : (row.estimatedCost || 0)),
    urgency: row.urgency,
    status,
    videoUrl: row.video_url !== undefined ? row.video_url : row.videoUrl,
    signature,
    approvedAt: row.approved_at !== undefined ? row.approved_at : row.approvedAt,
    createdAt: row.created_at !== undefined ? row.created_at : row.createdAt,
    updatedAt: row.updated_at !== undefined ? row.updated_at : row.updatedAt,
  };
}

export const db = {
  async list(): Promise<Inspection[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      return (data || []).map(row => decodeInspection(row));
    }
    
    return getMockData()
      .map(row => decodeInspection(row))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      return decodeInspection(data);
    }
    
    const item = getMockData().find(i => i.id === id);
    return item ? decodeInspection(item) : null;
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
      try {
        // Try the clean schema insert first (assuming 'vin' column exists)
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
            status: newRecord.status === 'ARCHIVED' ? 'APPROVED' : newRecord.status,
            video_url: newRecord.videoUrl,
            signature: newRecord.signature,
            approved_at: newRecord.approvedAt,
          }])
          .select()
          .single();
        if (error) throw error;
        return decodeInspection(data);
      } catch (err: any) {
        // Fallback: If 'vin' column is missing in remote DB, pack it inside repair_name
        if (
          err.message?.includes('column "vin"') || 
          err.message?.includes("'vin' column") ||
          err.hint?.includes('column "vin"')
        ) {
          const packedRepairName = newRecord.vin 
            ? `${newRecord.repairName} [VIN:${newRecord.vin}]` 
            : newRecord.repairName;
            
          const { data, error } = await supabase
            .from('inspections')
            .insert([{
              id: newRecord.id,
              vehicle_year: newRecord.vehicleYear,
              vehicle_make: newRecord.vehicleMake,
              vehicle_model: newRecord.vehicleModel,
              customer_phone: newRecord.customerPhone,
              repair_name: packedRepairName,
              estimated_cost: newRecord.estimatedCost,
              urgency: newRecord.urgency,
              status: newRecord.status === 'ARCHIVED' ? 'APPROVED' : newRecord.status,
              video_url: newRecord.videoUrl,
              signature: newRecord.signature,
              approved_at: newRecord.approvedAt,
            }])
            .select()
            .single();
          if (error) throw error;
          return decodeInspection(data);
        }
        throw err;
      }
    }

    const current = getMockData();
    current.push(newRecord);
    saveMockData(current);
    return decodeInspection(newRecord);
  },

  async update(id: string, updates: Partial<Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Inspection> {
    const now = new Date().toISOString();

    const current = await this.get(id);
    if (!current) throw new Error('Inspection not found');

    let targetStatus = updates.status !== undefined ? updates.status : current.status;
    let targetSignature = updates.signature !== undefined ? updates.signature : current.signature;

    if (updates.status === 'ARCHIVED') {
      if (current.status === 'APPROVED') {
        targetStatus = 'APPROVED';
        targetSignature = '[ARCHIVED_APPROVED] ' + (current.signature || '');
      } else if (current.status === 'DECLINED') {
        targetStatus = 'DECLINED';
        targetSignature = '[ARCHIVED_DECLINED]';
      } else {
        targetStatus = current.status === 'ARCHIVED' ? 'APPROVED' : current.status;
        targetSignature = '[ARCHIVED_PENDING]';
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: any = { updated_at: now };
        if (updates.vehicleYear !== undefined) dbUpdates.vehicle_year = updates.vehicleYear;
        if (updates.vehicleMake !== undefined) dbUpdates.vehicle_make = updates.vehicleMake;
        if (updates.vehicleModel !== undefined) dbUpdates.vehicle_model = updates.vehicleModel;
        if (updates.vin !== undefined) dbUpdates.vin = updates.vin;
        if (updates.customerPhone !== undefined) dbUpdates.customer_phone = updates.customerPhone;
        if (updates.repairName !== undefined) dbUpdates.repair_name = updates.repairName;
        if (updates.estimatedCost !== undefined) dbUpdates.estimated_cost = updates.estimatedCost;
        if (updates.urgency !== undefined) dbUpdates.urgency = updates.urgency;
        if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
        if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
        
        dbUpdates.status = targetStatus;
        dbUpdates.signature = targetSignature;

        const { data, error } = await supabase
          .from('inspections')
          .update(dbUpdates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return decodeInspection(data);
      } catch (err: any) {
        // Fallback: If 'vin' column is missing in remote DB, pack it inside repair_name
        if (
          err.message?.includes('column "vin"') || 
          err.message?.includes("'vin' column") ||
          err.hint?.includes('column "vin"')
        ) {
          const dbUpdates: any = { updated_at: now };
          if (updates.vehicleYear !== undefined) dbUpdates.vehicle_year = updates.vehicleYear;
          if (updates.vehicleMake !== undefined) dbUpdates.vehicle_make = updates.vehicleMake;
          if (updates.vehicleModel !== undefined) dbUpdates.vehicle_model = updates.vehicleModel;
          if (updates.customerPhone !== undefined) dbUpdates.customer_phone = updates.customerPhone;
          if (updates.estimatedCost !== undefined) dbUpdates.estimated_cost = updates.estimatedCost;
          if (updates.urgency !== undefined) dbUpdates.urgency = updates.urgency;
          if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
          if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
          
          dbUpdates.status = targetStatus;
          dbUpdates.signature = targetSignature;

          // Merge VIN with repair_name
          const baseRepairName = updates.repairName !== undefined ? updates.repairName : current.repairName;
          const targetVin = updates.vin !== undefined ? updates.vin : current.vin;
          
          let packedRepairName = baseRepairName;
          if (targetVin) {
            packedRepairName = baseRepairName.replace(/\s\[VIN:[A-Z0-9]{17}\]/i, '');
            packedRepairName = `${packedRepairName} [VIN:${targetVin}]`;
          }
          dbUpdates.repair_name = packedRepairName;

          const { data, error } = await supabase
            .from('inspections')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          return decodeInspection(data);
        }
        throw err;
      }
    }

    const currentMockList = getMockData();
    const index = currentMockList.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Inspection not found');

    const updatedRecord = {
      ...currentMockList[index],
      ...updates,
      status: targetStatus,
      signature: targetSignature,
      updatedAt: now,
    };
    currentMockList[index] = updatedRecord;
    saveMockData(currentMockList);
    return decodeInspection(updatedRecord);
  }
};
