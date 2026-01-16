'use client';

import { useEffect, useState } from 'react';
import { getLossEventsWithEnrichment, updateLossEvent, type EnrichedLossEvent } from '@/lib/data';

type AssignmentStatus = 'New' | 'Viewed' | 'Contacted' | 'Closed';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<EnrichedLossEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssignments() {
      try {
        setLoading(true);
        // Get events from last 7 days only
        const allEvents = await getLossEventsWithEnrichment();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentAssignments = allEvents.filter(event => {
          const eventDate = new Date(event.event_timestamp);
          return eventDate >= sevenDaysAgo;
        });
        
        setAssignments(recentAssignments);
        setError(null);
      } catch (err) {
        console.error('Error loading assignments:', err);
        setError('Failed to load assignments');
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, []);

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const mapStatusToAssignment = (status: string): AssignmentStatus => {
    switch (status) {
      case 'Unreviewed': return 'New';
      case 'Contacted': return 'Contacted';
      case 'Qualified': return 'Contacted';
      case 'Converted': return 'Closed';
      default: return 'New';
    }
  };

  const getStatusColor = (status: AssignmentStatus): string => {
    switch (status) {
      case 'New': return 'bg-[#00D9FF]/20 text-[#00D9FF] border-[#00D9FF]/30';
      case 'Viewed': return 'bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/30';
      case 'Contacted': return 'bg-[#00E5A0]/20 text-[#00E5A0] border-[#00E5A0]/30';
      case 'Closed': return 'bg-[#8B92A3]/20 text-[#8B92A3] border-[#8B92A3]/30';
      default: return 'bg-[#8B92A3]/20 text-[#8B92A3] border-[#8B92A3]/30';
    }
  };

  const handleStatusChange = async (eventId: string, newStatus: AssignmentStatus) => {
    try {
      // Map assignment status back to database status
      let dbStatus: 'Unreviewed' | 'Contacted' | 'Qualified' | 'Converted';
      switch (newStatus) {
        case 'New':
          dbStatus = 'Unreviewed';
          break;
        case 'Viewed':
          dbStatus = 'Unreviewed';
          break;
        case 'Contacted':
          dbStatus = 'Contacted';
          break;
        case 'Closed':
          dbStatus = 'Converted';
          break;
        default:
          dbStatus = 'Unreviewed';
      }
      
      await updateLossEvent(eventId, { status: dbStatus });
      
      // Update local state
      setAssignments(prev => prev.map(a => 
        a.id === eventId ? { ...a, status: dbStatus } : a
      ));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9FF] mx-auto mb-4"></div>
          <p className="text-[#B8BFCC]">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
          <p className="text-[#FF3B5C] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#00D9FF] text-slate-900 rounded-md hover:bg-[#00B8D9] font-semibold transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">New Loss Assignments</h1>
          <p className="text-sm text-[#B8BFCC]">Last 7 days • {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</p>
        </header>

        <div className="card p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1A1D29] text-[#B8BFCC] border-b border-[#3A4556]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Address</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Loss Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F3441]">
                {assignments.map((assignment) => {
                  const property = Array.isArray(assignment.loss_property) 
                    ? assignment.loss_property[0] 
                    : assignment.loss_property;
                  const address = property?.address || `ZIP ${assignment.zip}`;
                  const status = mapStatusToAssignment(assignment.status);
                  
                  return (
                    <tr key={assignment.id} className="hover:bg-[#3A4556]/30 transition">
                      <td className="px-4 py-3 text-white font-medium">{address}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          assignment.event_type === 'Fire' ? 'bg-[#FF3B5C]/20 text-[#FF3B5C] border border-[#FF3B5C]/30' :
                          assignment.event_type === 'Water' ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30' :
                          assignment.event_type === 'Wind' ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/30' :
                          assignment.event_type === 'Hail' ? 'bg-[#00E5A0]/20 text-[#00E5A0] border border-[#00E5A0]/30' :
                          'bg-[#8B92A3]/20 text-[#8B92A3] border border-[#8B92A3]/30'
                        }`}>
                          {assignment.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#B8BFCC]">{getTimeAgo(assignment.event_timestamp)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={status}
                          onChange={(e) => handleStatusChange(assignment.id, e.target.value as AssignmentStatus)}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusColor(status)} bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20`}
                        >
                          <option value="New">New</option>
                          <option value="Viewed">Viewed</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Closed">Closed / Dead</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/property/${assignment.id}`}
                          className="text-xs font-medium text-[#00D9FF] hover:text-[#00B8D9] underline-offset-2 hover:underline transition-colors duration-200"
                        >
                          View Details
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#8B92A3]">
                      No new assignments in the last 7 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
