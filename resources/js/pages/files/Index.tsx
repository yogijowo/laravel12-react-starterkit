import React, { useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { type BreadcrumbItem } from '@/types';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Folder,
  FolderPlus,
  Trash2,
  UploadCloud,
  ChevronRight,
  FileText,
  FileImage,
  FileArchive,
  FileAudio,
  FileVideo,
  File,
  Download,
  X,
  FolderRoot,
} from 'lucide-react';
import { toast } from 'sonner';

interface FolderNode {
  id: number;
  name: string;
  parent_id: number | null;
  children: FolderNode[];
}

interface FileNode {
  id: number;
  name: string;
  mime_type: string;
  url: string;
  size: string;
  created_at: string;
}

interface Props {
  folders: FolderNode[];
  currentFolderId: number | null;
  currentFolder: FolderNode | null;
  files: FileNode[];
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'File Management',
    href: '/files',
  },
];

function buildFolderTree(flat: FolderNode[]): (FolderNode & { children: FolderNode[] })[] {
  const map = new Map<number, FolderNode & { children: FolderNode[] }>();
  const roots: (FolderNode & { children: FolderNode[] })[] = [];

  flat.forEach(folder => {
    map.set(folder.id, { ...folder, children: [] });
  });

  flat.forEach(folder => {
    if (folder.parent_id) {
      const parent = map.get(folder.parent_id);
      if (parent) {
        parent.children.push(map.get(folder.id)!);
      }
    } else {
      roots.push(map.get(folder.id)!);
    }
  });

  return roots;
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return <FileImage className="w-5 h-5 text-blue-500" />;
  if (mime.startsWith('video/')) return <FileVideo className="w-5 h-5 text-purple-500" />;
  if (mime.startsWith('audio/')) return <FileAudio className="w-5 h-5 text-pink-500" />;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z')) 
    return <FileArchive className="w-5 h-5 text-yellow-500" />;
  if (mime.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (mime.includes('text') || mime.includes('csv') || mime.includes('json')) 
    return <FileText className="w-5 h-5 text-green-500" />;
  if (mime.includes('word')) return <FileText className="w-5 h-5 text-blue-600" />;
  if (mime.includes('excel') || mime.includes('sheet')) 
    return <FileText className="w-5 h-5 text-green-600" />;
  if (mime.includes('powerpoint') || mime.includes('presentation')) 
    return <FileText className="w-5 h-5 text-orange-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function isPreviewable(mime: string) {
  return (
    mime.startsWith('image/') || 
    mime.startsWith('text/') || 
    mime.includes('pdf') || 
    mime.includes('document')
  );
}

export default function FileManager({ folders, currentFolderId, currentFolder, files }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteFolderId, setDeleteFolderId] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<FileNode | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const confirmDeleteFolder = () => {
    if (!deleteFolderId) return;
  
    const deletingCurrent = deleteFolderId === currentFolderId;
  
    router.delete(`/media/${deleteFolderId}`, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Folder deleted successfully');
        setDeleteFolderId(null);
  
        if (deletingCurrent) {
          router.visit('/files', { replace: true });
        } else {
          router.reload({ only: ['folders'] });
        }
      },
      onError: () => toast.error('Failed to delete folder'),
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files[]', files[i]);
    }
    if (currentFolderId) formData.append('folder_id', currentFolderId.toString());

    setUploading(true);
    router.post('/files', formData, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        toast.success('File uploaded successfully');
        if (fileInputRef.current) fileInputRef.current.value = '';
        router.reload({ only: ['files'] });
      },
      onError: () => toast.error('Failed to upload file'),
      onFinish: () => setUploading(false),
    });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name cannot be empty');
      return;
    }

    setIsCreatingFolder(true);
    router.post('/media', {
      name: newFolderName,
      parent_id: currentFolderId,
    }, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Folder created successfully');
        setNewFolderName('');
        setIsCreatingFolder(false);
        router.reload({ only: ['folders'] });
      },
      onError: () => {
        toast.error('Failed to create folder');
        setIsCreatingFolder(false);
      },
    });      
  };

  const renderFolderTree = (nodes: (FolderNode & { children: FolderNode[] })[], level = 0) => {
    return nodes.map((folder) => (
      <div key={folder.id} style={{ marginLeft: level * 12 }} className="mb-1">
        <div
          className={`flex items-center gap-1 cursor-pointer hover:bg-accent p-1 rounded ${currentFolderId === folder.id ? 'bg-accent' : ''}`}
          onClick={() => router.visit(`/files?folder_id=${folder.id}`)}
        >
          {folder.children.length > 0 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          {folder.children.length === 0 && (
            <span className="w-4 h-4"></span>
          )}
          
          <Folder className="w-4 h-4 text-yellow-500" />
          <span className="text-sm truncate flex-1">{folder.name}</span>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteFolderId(folder.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
                <AlertDialogDescription>
                  Folder <strong>{folder.name}</strong> and all its contents will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteFolder}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {folder.children.length > 0 && (
          <div className="ml-4">
            {renderFolderTree(folder.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="File Manager" />
      <div className="flex-1 p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Folder Tree */}
        <div className="md:col-span-1 border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Folder Structure</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCreatingFolder(true)}
              className="gap-1"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Folder</span>
            </Button>
          </div>
          
          <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
            <div
              className={`flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded mb-2 ${!currentFolderId ? 'bg-accent' : ''}`}
              onClick={() => router.visit('/files')}
            >
              <FolderRoot className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Root Folder</span>
            </div>
            {renderFolderTree(buildFolderTree(folders ?? []))}
          </div>
        </div>

        {/* Main Panel File View */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {currentFolder ? currentFolder.name : 'Root Folder'}
              </h2>
              {currentFolder && (
                <span className="text-sm text-muted-foreground">
                  ({files.length} {files.length === 1 ? 'item' : 'items'})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
                multiple
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploading}
                className="gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>

          <Separator />

          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Folder className="w-12 h-12 mb-2" />
              <p>No files in this folder</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload the first file
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <div 
                  key={file.id} 
                  className="border border-border rounded-lg bg-card p-4 hover:border-primary transition-colors group cursor-pointer"
                  onClick={() => isPreviewable(file.mime_type) ? setPreviewFile(file) : null}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.mime_type)}
                      <div className="overflow-hidden">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.size}</p>
                        <p className="text-xs text-muted-foreground">{file.created_at}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={file.url} 
                        download={file.name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-muted-foreground hover:text-primary"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button 
                            className="p-1 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete File?</AlertDialogTitle>
                            <AlertDialogDescription>
                              File <strong>{file.name}</strong> will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => router.delete(`/files/${file.id}`, {
                                preserveScroll: true,
                                onSuccess: () => {
                                  setPreviewFile(null);
                                  router.reload({ only: ['files'] });
                                },
                              })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreatingFolder(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          {previewFile && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{previewFile.name}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto p-4">
                {previewFile.mime_type.startsWith('image/') ? (
                  <img 
                    src={previewFile.url} 
                    alt={previewFile.name} 
                    className="max-w-full max-h-[70vh] mx-auto object-contain"
                  />
                ) : previewFile.mime_type.includes('pdf') ? (
                  <iframe 
                    src={previewFile.url} 
                    className="w-full h-[70vh] border border-border rounded"
                    title={previewFile.name}
                  />
                ) : previewFile.mime_type.startsWith('text/') ? (
                  <div className="bg-muted p-4 rounded h-[70vh] overflow-auto">
                    <pre className="whitespace-pre-wrap">{/* Content would be loaded here */}</pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <File className="w-12 h-12 mb-2" />
                    <p>Preview not available</p>
                    <a 
                      href={previewFile.url} 
                      download={previewFile.name}
                      className="mt-2 text-primary hover:underline"
                    >
                      Download file
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}