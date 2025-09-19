import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { StickyNote, Plus, Edit, Trash2, Save } from 'lucide-react';

interface TeacherNote {
  id: string;
  note_content: string;
  created_at: string;
  updated_at: string;
}

const TeacherNotes = () => {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<TeacherNote | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [profile]);

  const fetchNotes = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('teacher_notes')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !profile) {
      toast({
        title: "Error",
        description: "Please enter some content for the note",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teacher_notes')
        .insert([{
          teacher_id: profile.id,
          note_content: newNote.trim(),
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note added successfully",
      });

      setNewNote('');
      fetchNotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editingNote.note_content.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for the note",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('teacher_notes')
        .update({ note_content: editingNote.note_content.trim() })
        .eq('id', editingNote.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note updated successfully",
      });

      setEditingNote(null);
      fetchNotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('teacher_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note deleted successfully",
      });

      fetchNotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (profile?.role !== 'teacher') {
    return <div className="text-center">Access denied. Teachers only.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Notes</h1>
        <p className="text-muted-foreground">
          Keep track of book ideas, requirements, and important information
        </p>
      </div>

      {/* Add New Note */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Note
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write your note here... 
              
Examples:
- Book ideas for next semester
- Requirements from students
- Important publishing information
- Budget considerations"
              className="min-h-32"
            />
            <Button onClick={handleAddNote} disabled={loading || !newNote.trim()}>
              <StickyNote className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {notes.map((note) => (
          <Card key={note.id} className="h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">
                  {formatDate(note.created_at)}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingNote(note)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingNote?.id === note.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editingNote.note_content}
                    onChange={(e) => setEditingNote({
                      ...editingNote,
                      note_content: e.target.value
                    })}
                    className="min-h-24"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdateNote} disabled={loading}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setEditingNote(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm text-foreground">
                  {note.note_content}
                </div>
              )}
              
              {note.created_at !== note.updated_at && editingNote?.id !== note.id && (
                <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                  Updated: {formatDate(note.updated_at)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {notes.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <StickyNote className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Notes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first note to keep track of book ideas and important information
            </p>
            <p className="text-sm text-muted-foreground">
              Use notes to remember:
              <br />• Book recommendations from colleagues
              <br />• Student feedback and requirements  
              <br />• Budget planning and priorities
              <br />• Publishing details and deadlines
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherNotes;