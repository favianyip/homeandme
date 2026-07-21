<%@ Page Language="C#" AutoEventWireup="true" CodeFile="HNMFBlistner.aspx.cs" Inherits="HNMFBlistner" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title></title>
</head>
<body>
    <form id="form1" runat="server">
        <asp:Panel ID="pnlFaceBookUser" runat="server">
            <hr />
            <table>
                <tr>
                    <td rowspan="99" valign="top">
                        <asp:Image ID="ProfileImage" runat="server" Width="100" Height="100" />
                    </td>
                </tr>
                <tr>
                    <td><strong>ID:</strong>
                        <asp:Label ID="lblId" runat="server" Text=""></asp:Label></td>
                </tr>
                <tr>
                    <td><strong>Name:</strong>
                        <asp:Label ID="lblName" runat="server" Text=""></asp:Label></td>
                </tr>
                <tr>
                    <td><strong>First Name:</strong>
                        <asp:Label ID="lblFirstName" runat="server" Text=""></asp:Label></td>
                </tr>
                <tr>
                    <td><strong>Last Name:</strong>
                        <asp:Label ID="lblLastName" runat="server" Text=""></asp:Label></td>
                </tr>
                <tr>
                    <td><strong>Short Name:</strong>
                        <asp:Label ID="lblShortName" runat="server" Text=""></asp:Label></td>
                </tr>
                <tr>
                    <td><strong>Name Format:</strong>
                        <asp:Label ID="lblNameFormat" runat="server" Text=""></asp:Label></td>
                </tr>
                <tr>
                    <td><strong>Email:</strong>
                        <asp:Label ID="lblEmail" runat="server" Text=""></asp:Label></td>
                </tr>
                <tr>
                    <td><strong>Picture Height:</strong>
                        <asp:Label ID="lblPictureHeight" runat="server" Text=""></asp:Label></td>
                </tr>
                <tr>
                    <td><strong>Picture Width:</strong>
                        <asp:Label ID="lblPictureWidth" runat="server" Text=""></asp:Label></td>
                </tr>
                <tr>
                    <td></td>
                </tr>
                <tr>
                    <td></td>
                </tr>
                <tr>
                    <td>
                        <a id="anchBack" runat="server" href="#" style="font-weight: 600">Back</a></td>
                </tr>
            </table>
        </asp:Panel>
    </form>
</body>
</html>
