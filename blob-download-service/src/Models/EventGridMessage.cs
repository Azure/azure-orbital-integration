// Copyright (c) 2022 Microsoft Corporation. All rights reserved.
// Software is licensed under the MIT License. See LICENSE in the project
// root for license information.

namespace BlobDownloadService
{
    public class EventGridMessage
    {
        public string Topic { get; set; }
        public string Subject { get; set; }
        public string EventType { get; set; }
        public string Id { get; set; }
        public Data Data { get; set; }
        public string DataVersion { get; set; }
        public string MmetadataVersion { get; set; }
        public DateTime EventTime { get; set; }

        public string ContainerName =>
            Subject.Split("containers/")[1].Split("/")[0];
        public string BlobName =>
            Subject.Split("blobs/")[1];
    }

    public class Data
    {
        public string Api { get; set; }
        public string ClientRequestId { get; set; }
        public string RequestId { get; set; }
        public string ETag { get; set; }
        public string ContentType { get; set; }
        public long ContentLength { get; set; }
        public string BlobType { get; set; }
        public string BlobUrl { get; set; }
        public string Url { get; set; }
        public string Sequencer { get; set; }
        public string Identity { get; set; }
        public StorageDiagnostics StorageDiagnostics { get; set; }
    }

    public class StorageDiagnostics
    {
        public string BatchId { get; set; }
    }
}