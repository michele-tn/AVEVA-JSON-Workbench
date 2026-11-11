using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;

public static class WindowsIconResource
{
    private static readonly IntPtr Icon = new IntPtr(3);
    private static readonly IntPtr IconGroup = new IntPtr(14);

    private delegate bool ResourceNameCallback(IntPtr module, IntPtr type, IntPtr name, IntPtr parameter);
    private delegate bool ResourceLanguageCallback(IntPtr module, IntPtr type, IntPtr name, ushort language, IntPtr parameter);

    [DllImport("kernel32.dll", EntryPoint = "LoadLibraryExW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr LoadLibraryEx(string path, IntPtr reserved, uint flags);
    [DllImport("kernel32.dll")]
    private static extern bool FreeLibrary(IntPtr module);
    [DllImport("kernel32.dll", EntryPoint = "EnumResourceNamesW")]
    private static extern bool EnumResourceNames(IntPtr module, IntPtr type, ResourceNameCallback callback, IntPtr parameter);
    [DllImport("kernel32.dll", EntryPoint = "EnumResourceLanguagesW")]
    private static extern bool EnumResourceLanguages(IntPtr module, IntPtr type, IntPtr name, ResourceLanguageCallback callback, IntPtr parameter);
    [DllImport("kernel32.dll", EntryPoint = "FindResourceW", SetLastError = true)]
    private static extern IntPtr FindResource(IntPtr module, IntPtr name, IntPtr type);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr LoadResource(IntPtr module, IntPtr resource);
    [DllImport("kernel32.dll")]
    private static extern IntPtr LockResource(IntPtr resource);
    [DllImport("kernel32.dll", EntryPoint = "BeginUpdateResourceW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr BeginUpdateResource(string path, bool deleteExisting);
    [DllImport("kernel32.dll", EntryPoint = "UpdateResourceW", SetLastError = true)]
    private static extern bool UpdateResource(IntPtr handle, IntPtr type, IntPtr name, ushort language, byte[] data, uint length);
    [DllImport("kernel32.dll", EntryPoint = "EndUpdateResourceW", SetLastError = true)]
    private static extern bool EndUpdateResource(IntPtr handle, bool discard);

    private static IntPtr FirstGroupName(IntPtr module)
    {
        var groupName = new IntPtr(1);
        EnumResourceNames(module, IconGroup, (handle, type, name, parameter) =>
        {
            if ((ulong)name.ToInt64() > ushort.MaxValue) return true;
            groupName = name;
            return false;
        }, IntPtr.Zero);
        return groupName;
    }

    public static int[] GetSizes(string executable)
    {
        var module = LoadLibraryEx(executable, IntPtr.Zero, 2);
        if (module == IntPtr.Zero) throw new Win32Exception();
        try
        {
            var resource = FindResource(module, FirstGroupName(module), IconGroup);
            if (resource == IntPtr.Zero) throw new Win32Exception();
            var group = LockResource(LoadResource(module, resource));
            if (group == IntPtr.Zero) throw new Win32Exception();
            var sizes = new int[Marshal.ReadInt16(group, 4)];
            for (int index = 0; index < sizes.Length; index++)
            {
                var dimension = Marshal.ReadByte(group, 6 + 14 * index);
                sizes[index] = dimension == 0 ? 256 : dimension;
            }
            return sizes;
        }
        finally
        {
            FreeLibrary(module);
        }
    }

    public static void Replace(string executable, string iconPath)
    {
        IntPtr groupName;
        var languages = new List<ushort>();
        var module = LoadLibraryEx(executable, IntPtr.Zero, 2);
        if (module == IntPtr.Zero) throw new Win32Exception();
        try
        {
            groupName = FirstGroupName(module);
            EnumResourceLanguages(module, IconGroup, groupName, (handle, type, name, language, parameter) =>
            {
                languages.Add(language);
                return true;
            }, IntPtr.Zero);
        }
        finally
        {
            FreeLibrary(module);
        }
        if (languages.Count == 0) languages.Add(0);

        var icon = File.ReadAllBytes(iconPath);
        var count = BitConverter.ToUInt16(icon, 4);
        var group = new byte[6 + 14 * count];
        Buffer.BlockCopy(icon, 0, group, 0, 6);
        var update = BeginUpdateResource(executable, false);
        if (update == IntPtr.Zero) throw new Win32Exception();

        var discard = true;
        try
        {
            for (int index = 0; index < count; index++)
            {
                var iconEntry = 6 + 16 * index;
                var groupEntry = 6 + 14 * index;
                var id = (ushort)(300 + index);
                var image = new byte[BitConverter.ToInt32(icon, iconEntry + 8)];
                Buffer.BlockCopy(icon, BitConverter.ToInt32(icon, iconEntry + 12), image, 0, image.Length);
                Buffer.BlockCopy(icon, iconEntry, group, groupEntry, 12);
                Buffer.BlockCopy(BitConverter.GetBytes(id), 0, group, groupEntry + 12, 2);
                foreach (var language in languages)
                {
                    if (!UpdateResource(update, Icon, new IntPtr(id), language, image, (uint)image.Length))
                        throw new Win32Exception();
                }
            }
            foreach (var language in languages)
            {
                if (!UpdateResource(update, IconGroup, groupName, language, group, (uint)group.Length))
                    throw new Win32Exception();
            }
            discard = false;
        }
        finally
        {
            if (!EndUpdateResource(update, discard) && !discard) throw new Win32Exception();
        }
    }
}
