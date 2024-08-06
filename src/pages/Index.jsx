import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Index = () => {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const queryClient = useQueryClient();

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
    },
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const lines = content.split('\n');
        const headers = lines[0].split(',');
        const data = lines.slice(1).map((line) => {
          const values = line.split(',');
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
          }, {});
        });
        setHeaders(headers);
        setCsvData(data);
        queryClient.setQueryData(['csvData'], data);
      };
      reader.readAsText(file);
    },
  });

  const { data } = useQuery({
    queryKey: ['csvData'],
    queryFn: () => csvData,
    enabled: csvData.length > 0,
  });

  const addRowMutation = useMutation({
    mutationFn: (newRow) => {
      return new Promise((resolve) => {
        setCsvData((prevData) => [...prevData, newRow]);
        resolve();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['csvData']);
      toast.success('Row added successfully');
    },
  });

  const updateRowMutation = useMutation({
    mutationFn: ({ index, updatedRow }) => {
      return new Promise((resolve) => {
        setCsvData((prevData) => {
          const newData = [...prevData];
          newData[index] = updatedRow;
          return newData;
        });
        resolve();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['csvData']);
      toast.success('Row updated successfully');
    },
  });

  const deleteRowMutation = useMutation({
    mutationFn: (index) => {
      return new Promise((resolve) => {
        setCsvData((prevData) => prevData.filter((_, i) => i !== index));
        resolve();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['csvData']);
      toast.success('Row deleted successfully');
    },
  });

  const handleAddRow = () => {
    const newRow = headers.reduce((obj, header) => {
      obj[header] = '';
      return obj;
    }, {});
    addRowMutation.mutate(newRow);
  };

  const handleUpdateRow = (index, updatedRow) => {
    updateRowMutation.mutate({ index, updatedRow });
  };

  const handleDeleteRow = (index) => {
    deleteRowMutation.mutate(index);
  };

  const handleDownload = () => {
    const csvContent = [
      headers.join(','),
      ...data.map((row) => headers.map((header) => row[header]).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'edited_data.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">CSV Editor</h1>
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        <p>Drag 'n' drop a CSV file here, or click to select one</p>
      </div>
      {data && data.length > 0 && (
        <>
          <Table>
            <Table.Header>
              <Table.Row>
                {headers.map((header) => (
                  <Table.Head key={header}>{header}</Table.Head>
                ))}
                <Table.Head>Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.map((row, index) => (
                <Table.Row key={index}>
                  {headers.map((header) => (
                    <Table.Cell key={header}>
                      <Input
                        value={row[header]}
                        onChange={(e) => handleUpdateRow(index, { ...row, [header]: e.target.value })}
                      />
                    </Table.Cell>
                  ))}
                  <Table.Cell>
                    <Button variant="destructive" onClick={() => handleDeleteRow(index)}>
                      Delete
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          <div className="mt-4">
            <Button onClick={handleAddRow} className="mr-2">
              Add Row
            </Button>
            <Button onClick={handleDownload}>Download CSV</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
